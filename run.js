#!/usr/bin/env node

/**
 * Weatherwise - Unified JavaScript Runner
 * Starts both the Express Backend API (Port 5000) and the Frontend Web Server (Port 8080)
 * using pure Node.js (no Python or external runner required).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const BACKEND_DIR = path.join(__dirname, 'backend');
const FRONTEND_DIR = path.join(__dirname, 'frontend');
const FRONTEND_PORT = process.env.FRONTEND_PORT || 8080;
const BACKEND_PORT = process.env.PORT || 5000;

// Ensure backend .env exists
const envPath = path.join(BACKEND_DIR, '.env');
const envExamplePath = path.join(BACKEND_DIR, '.env.example');
if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  console.log('[Runner] Creating backend/.env from .env.example...');
  fs.copyFileSync(envExamplePath, envPath);
}

// -------------------------------------------------------------
// 1. FRONTEND STATIC HTTP SERVER (Port 8080)
// -------------------------------------------------------------
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const frontendServer = http.createServer((req, res) => {
  // Normalize request URL
  let parsedUrl = req.url.split('?')[0];
  if (parsedUrl === '/' || parsedUrl === '') {
    parsedUrl = '/index.html';
  }

  // Prevent directory traversal
  const safePath = path.normalize(parsedUrl).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(FRONTEND_DIR, safePath);

  // If index.html doesn't exist for some reason, fallback to demo.html
  if (safePath === '/index.html' && !fs.existsSync(filePath)) {
    filePath = path.join(FRONTEND_DIR, 'demo.html');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found: ${parsedUrl}`);
      console.log(`[Frontend] 404 ${req.method} ${parsedUrl}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

frontendServer.listen(FRONTEND_PORT, () => {
  printBanner();
});

// -------------------------------------------------------------
// 2. BACKEND API PROCESS (Port 5000)
// -------------------------------------------------------------
const backendProcess = spawn(process.execPath, ['server.js'], {
  cwd: BACKEND_DIR,
  env: { ...process.env, PORT: BACKEND_PORT },
  stdio: ['inherit', 'pipe', 'pipe'],
});

backendProcess.stdout.on('data', (data) => {
  const lines = data.toString().trimEnd().split('\n');
  lines.forEach((line) => {
    if (line.trim()) console.log(`[Backend] ${line}`);
  });
});

backendProcess.stderr.on('data', (data) => {
  const lines = data.toString().trimEnd().split('\n');
  lines.forEach((line) => {
    if (line.trim()) console.error(`[Backend Err] ${line}`);
  });
});

backendProcess.on('close', (code) => {
  console.log(`[Runner] Backend process exited with code ${code}`);
  shutdown(code || 0);
});

// -------------------------------------------------------------
// 3. BANNER & SHUTDOWN HANDLING
// -------------------------------------------------------------
function printBanner() {
  console.log('\n============================================================');
  console.log('              WEATHERWISE - FULL STACK APP                  ');
  console.log('       AI Weather Forecasts & Personalized Insights        ');
  console.log('============================================================');
  console.log(`  Frontend App:     http://localhost:${FRONTEND_PORT}/`);
  console.log(`  Standalone Demo:  http://localhost:${FRONTEND_PORT}/demo.html`);
  console.log(`  Backend REST API: http://localhost:${BACKEND_PORT}/api`);
  console.log(`  Health Check:     http://localhost:${BACKEND_PORT}/api/health`);
  console.log('============================================================');
  console.log('  Both servers are live! Press Ctrl+C to stop.\n');
}

let isShuttingDown = false;
function shutdown(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n[Runner] Shutting down Weatherwise servers...');

  frontendServer.close(() => {
    console.log('[Runner] Frontend server stopped.');
  });

  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill('SIGTERM');
    setTimeout(() => {
      if (!backendProcess.killed) backendProcess.kill('SIGKILL');
      process.exit(exitCode);
    }, 1500);
  } else {
    process.exit(exitCode);
  }
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
