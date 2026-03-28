<?php
/**
 * Optional PHP router for Apache/LAMP stacks.
 * Maps pretty paths to HTML entry points. On Render, FastAPI serves /app/ directly.
 */
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path = rtrim($path, '/') ?: '/';

$routes = [
    '/' => 'index.html',
    '/login' => 'login.html',
    '/dashboard' => 'dashboard.html',
];

if (isset($routes[$path])) {
    readfile(__DIR__ . '/' . $routes[$path]);
    exit;
}

http_response_code(404);
echo 'Not found';
