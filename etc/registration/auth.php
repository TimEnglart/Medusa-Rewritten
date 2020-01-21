<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
$settings = include('settings.php');
date_default_timezone_set('Australia/Brisbane');

function base64UrlDecode($inputStr)
{
    return base64_decode(strtr($inputStr, '-_,', '+/='));
}

$encrypted_state = base64UrlDecode($_GET['state']);

$state = openssl_decrypt($encrypted_state, $settings['encryption']['algorithm'], $settings['encryption']['key'], 0, $settings['encryption']['iv']);
try{
	$parsed_state = unserialize($state);
	$expected_hash = $parsed_state["hash"];
	unset($parsed_state["hash"]); // remove hash from serialized hash
	
	if(hash('sha256', serialize($parsed_state)) != $expected_hash)
	{
		throw new Exception();
	}
}
catch(Exception $e)
{
	echo "Data Corrupted";
	die();
}

if (isset($_GET['code'])) {
    $post = http_build_query(array(
        'client_id' => $settings['bungie-api']['client-id'],
        'grant_type' => 'authorization_code',
        'code' => htmlspecialchars($_GET['code'])
    ));
    

    $ch = curl_init('https://www.bungie.net/platform/app/oauth/token/');
    curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/x-www-form-urlencoded'));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $post);
    $response = curl_exec($ch);
    curl_close($ch);


    echo "<h2>Bungie OAuth Response</h2><hr><br>";
    $data = json_decode($response);
    if (isset($data->error)) {
        echo "<h3 style=\"color: red\">Failure</h3><br>";
    } else {
        echo "<h3 style=\"color: green\">Success</h3>";
        if (isset($state)) {
            $person = new Registeree($data, $state, $settings);
            if ($person) {
                echo "<h4 style=\"color: orange\">Account Successfully Linked to The Lighthouse Discord</h4>";
            }
        }
    }
} else {
    echo "<h2>No Enough Data Provided</h2>";
}



class Registeree
{
    public $bungie_id;
    public $state_data;
    public $player_data;
    public $response_data;
    private $db;
    private $settings;
    function __construct($response, $state_data, $settings)
    {
        $this->settings = $settings;
        //Set Public Variables
        $this->db = $this->initiateDatabaseConnection();
        if($this->db->connect_errno > 0){
    		die('Database Connection Error');
		}
		$this->state_data = $state_data;
        $this->response_data = $response;
        $this->bungie_id = $this->response_data->membership_id;
		$this->player_data = $this->getPlayerData($this->response_data->membership_id);
		

        $discord_id = $this->state_data['did'];
        $destiny_profiles = $this->player_data->Response->profiles;
        $this->updateData($discord_id, $this->bungie_id);
        $this->echoData();
    }
    private function getPlayerData($bungie_id)
    {
        $rep_data = $this->response_data;
        $bungie_request = curl_init("https://www.bungie.net/Platform/Destiny2/254/Profile/$bungie_id/LinkedProfiles/");
        curl_setopt($bungie_request, CURLOPT_HTTPHEADER, array(
            "X-API-Key: " . $this->settings['bungie-api']['key'],
            "Authorization: $rep_data->token_type $rep_data->access_token",
            "Content-Type: application/json"
        ));
        curl_setopt($bungie_request, CURLOPT_RETURNTRANSFER, true);
        $user_data = curl_exec($bungie_request);
        curl_close($bungie_request);
        return json_decode($user_data);
    }
    private function updateData($discord_id, $bungie_id)
    {
        $b_select_query = "SELECT * FROM U_Bungie_Account WHERE user_id = $discord_id OR bungie_id = $bungie_id;";
        $b_update_query = "UPDATE U_Bungie_Account SET user_id = $discord_id, bungie_id = $bungie_id, time_added = NOW() WHERE bungie_id = $bungie_id OR user_id = $discord_id;";
        $b_insert_query = "INSERT INTO U_Bungie_Account (user_id, bungie_id, time_added) VALUES ($discord_id, $bungie_id, NOW());";

		if(!$bungie_acc = $this->db->query($b_select_query)){
            echo "Select Error <br> $b_select_query";
    		die('Select Error');
		}
		
		if($bungie_acc->num_rows > 0){ // There is a Record
    		if(!$bungie_update = $this->db->query($b_update_query)){
                echo "Update Error<br> $b_update_query";
    			die('Update Error');
			}
			//$bungie_update->free();
		}
		else {
			if(!$bungie_insert = $this->db->query($b_insert_query)){
                echo "Insert Error <br> $b_insert_query";
    			die('Insert Error');
			}
			//$bungie_insert->free();
		}
		$bungie_acc->free();

        foreach($this->player_data->Response->profiles as $destinyProfile){
            $d_insert_query = "INSERT INTO U_Destiny_Profile (bungie_id, destiny_id, membership_id) VALUES ($bungie_id, $destinyProfile->membershipId, $destinyProfile->membershipType);";
            $d_update_query = "UPDATE U_Destiny_Profile SET bungie_id = $bungie_id, destiny_id = $destinyProfile->membershipId, membership_id = $destinyProfile->membershipType WHERE bungie_id = $bungie_id OR destiny_id = $destinyProfile->membershipId;";
			$d_select_query = "SELECT * FROM U_Destiny_Profile WHERE bungie_id = $bungie_id OR destiny_id = $destinyProfile->membershipId;";


			if(!$destiny_acc = $this->db->query($d_select_query)){
                echo "Select Error <br> $d_select_query";
    			die('Select Error');
			}
		// $row = $bungie_acc->fetch_assoc()
			if($destiny_acc->num_rows > 0){ // There is a Record
    			if(!$destiny_update = $this->db->query($d_update_query)){
                     echo "Update Error<br> $d_update_query";
    				die('Update Error');
				}
				//$destiny_update->free();
			}
			else {
				if(!$destiny_insert = $this->db->query($d_insert_query)){
                    echo "Insert Error <br> $d_insert_query";
    				die('Insert Error');
				}
				//$destiny_insert->free();
			}
			$destiny_acc->free();
        }
    }
    private function echoData()
    {
        echo "Bungie ID: $this->bungie_id <br>";
        echo "Discord ID: " . $this->state_data['did'] . "<br>";
    }
    private function initiateDatabaseConnection()
    {
        return new mysqli(
            $this->settings['database']['hostname'], 
            $this->settings['database']['username'], 
            $this->settings['database']['password'], 
            $this->settings['database']['name'], 
            $this->settings['database']['port']
        );
    }
}
?>

