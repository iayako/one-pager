<?php
declare(strict_types=1);

$_GET['refresh'] = '1';
$_SERVER['REQUEST_METHOD'] = 'GET';

require dirname(__DIR__) . '/api/vehicle_images.php';

