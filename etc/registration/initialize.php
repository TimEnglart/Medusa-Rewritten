<?php
define('AES_KEY', 'kH&3$sjj3D6?fV*UXc@Y6M5vQh63vY2yKs&h6+w-HJ');
session_start();
function redirect($url, $statusCode = 303)
{
    header('Location: ' . $url, true, $statusCode);
    die();
}

function base64UrlEncode($inputStr)
{
    return strtr(base64_encode($inputStr), '+/=', '-_,');
}

$vars = array();
foreach ($_GET as $key => $value) {
    array_push($vars, "$key=$value");
}
$encryptedString = openssl_encrypt(implode($vars, '&'), 'AES256', AES_KEY);
$bungieOAuth = "https://www.bungie.net/en/oauth/authorize?response_type=code&client_id=27364&state=" . base64UrlEncode($encryptedString/*implode($vars, '&')*/ );
redirect($bungieOAuth);
?>