<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
$settings = include('settings.php');
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
	$vars[$key] = $value;
}
$vars["hash"] = hash('sha256', serialize($vars));

$bungieOAuth = "https://www.bungie.net/en/oauth/authorize?response_type=code&client_id=" . $settings['bungie-api']['client-id'] . "&state=" . base64UrlEncode(
	openssl_encrypt(serialize($vars), $settings['encryption']['algorithm'], $settings['encryption']['key'], 0, $settings['encryption']['iv'])
);
redirect($bungieOAuth);
