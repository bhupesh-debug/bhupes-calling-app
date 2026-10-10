const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;
const ROOT_DIR = __dirname;
const INDEX_PATH = path.join(ROOT_DIR, 'index.html');
const DOWNLOADS_PATH = 'C:\\Users\\bhupe\\Downloads\\Bhupes Calling — Call Script.html';

// SSE Clients for Live Reload
const sseClients = new Set();

function broadcastReload() {
  console.log('[LiveReload] Change detected, reloading browser...');
  for (const res of sseClients) {
    try {
      res.write('data: reload\n\n');
    } catch (e) {
      sseClients.delete(res);
    }
  }
}

// Watch index.html with debounce
let debounceTimer = null;
function handleFileChange() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    broadcastReload();
  }, 250);
}

try {
  fs.watch(INDEX_PATH, handleFileChange);
} catch (e) {}

const LIVE_RELOAD_SCRIPT = `
<!-- Antigravity Live Reload -->
<script>
(function(){
  try {
    var es = new EventSource('/_live');
    es.onmessage = function(e){
      if(e.data === 'reload'){
        console.log('[LiveReload] Refreshing...');
        window.location.reload();
      }
    };
    es.onerror = function(){
      // Reconnect after 2s if server restarts
      setTimeout(function(){ location.reload(); }, 2500);
    };
  } catch(e){}
})();
</script>
`;

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // SSE endpoint
  if (pathname === '/_live') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('data: connected\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // Launch Granola App API endpoint
  if (pathname === '/api/launch-granola') {
    const { exec } = require('child_process');
    const granolaPath = 'C:\\Users\\bhupe\\AppData\\Local\\Programs\\granola\\Granola.exe';
    exec(`start "" "${granolaPath}"`, (err) => {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      if (err) {
        res.end(JSON.stringify({ success: false, error: err.message }));
      } else {
        res.end(JSON.stringify({ success: true }));
      }
    });
    return;
  }

  // Serve index.html or static files
  let filePath = pathname === '/' ? INDEX_PATH : path.join(ROOT_DIR, pathname);

  if (!fs.existsSync(filePath)) {
    filePath = INDEX_PATH;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    if (ext === '.html') {
      fs.readFile(filePath, 'utf8', (readErr, content) => {
        if (readErr) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error reading file');
          return;
        }

        // Inject live reload script
        let modified = content;
        if (content.includes('</body>')) {
          modified = content.replace('</body>', LIVE_RELOAD_SCRIPT + '</body>');
        } else {
          modified = content + LIVE_RELOAD_SCRIPT;
        }

        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        });
        res.end(modified);
      });
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  🚀 BHUPES CALLING LOCALHOST LIVE SERVER ACTIVE!     `);
  console.log(`  👉 Localhost: http://localhost:${PORT}             `);
  console.log(`  ⚡ Live Reload: Enabled                             `);
  console.log(`======================================================\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const nextPort = PORT + 1;
    console.log(`Port ${PORT} in use, trying ${nextPort}...`);
    server.listen(nextPort);
  } else {
    console.error('Server error:', err);
  }
});
