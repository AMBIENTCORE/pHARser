const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const DATA_DIR = process.env.HOME ? path.join(process.env.HOME, 'data') : path.join(__dirname, 'data');
const COUNTER_FILE = path.join(DATA_DIR, 'counter.json');

function readCounters() {
  try { return JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8')); }
  catch { return { pageViews: 0, harsLoaded: 0 }; }
}

function writeCounters(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(COUNTER_FILE, JSON.stringify(data));
}

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml', '.har': 'application/json',
};

const server = http.createServer((req, res) => {
  // Counter API
  if (req.url.startsWith('/api/counter')) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const action = url.searchParams.get('action');

    const counters = readCounters();
    if (action === 'pageView') counters.pageViews++;
    else if (action === 'harLoaded') counters.harsLoaded++;
    writeCounters(counters);

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    });
    res.end(JSON.stringify(counters));
    return;
  }

  // Static files
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath).toLowerCase();

  // Prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403); res.end(); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Fallback to index.html for SPA-like behavior
      fs.readFile(path.join(__dirname, 'index.html'), (err2, data2) => {
        if (err2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data2);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`pHARser running on port ${PORT}`));
