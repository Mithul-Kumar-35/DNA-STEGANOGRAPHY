const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HOST = '0.0.0.0';
const PORT = Number(process.env.PORT || 8080);
const ROOT_DIR = __dirname;
const USERS_FILE = path.join(ROOT_DIR, 'users.json');

const sessions = new Map();
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

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
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers
  });
  res.end(JSON.stringify(payload));
}

function getCookieMap(req) {
  const cookieHeader = req.headers.cookie || '';
  const cookies = {};
  cookieHeader.split(';').forEach((part) => {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey) return;
    cookies[rawKey] = decodeURIComponent(rawValue.join('='));
  });
  return cookies;
}

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function ensureUsersFile() {
  if (!fs.existsSync(USERS_FILE)) {
    const initial = { users: {} };
    fs.writeFileSync(USERS_FILE, JSON.stringify(initial, null, 2), 'utf8');
  }
}

function readUsers() {
  ensureUsersFile();
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.users !== 'object') {
      return { users: {} };
    }
    return parsed;
  } catch (_) {
    return { users: {} };
  }
}

function writeUsers(db) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function hashPassword(password, saltHex) {
  const salt = saltHex || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, userRecord) {
  if (!userRecord || !userRecord.salt || !userRecord.hash) return false;
  const { hash } = hashPassword(password, userRecord.salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(userRecord.hash, 'hex'));
}

function createSession(username) {
  const sid = crypto.randomBytes(24).toString('hex');
  sessions.set(sid, {
    username,
    expiresAt: Date.now() + SESSION_TTL_MS
  });
  return sid;
}

function clearExpiredSessions() {
  const now = Date.now();
  for (const [sid, session] of sessions.entries()) {
    if (!session || session.expiresAt < now) {
      sessions.delete(sid);
    }
  }
}

function getSessionUser(req) {
  clearExpiredSessions();
  const cookies = getCookieMap(req);
  const sid = cookies.sid;
  if (!sid || !sessions.has(sid)) return null;
  const session = sessions.get(sid);
  return session.username;
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (_) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function setSessionCookie(res, sid) {
  const cookie = [
    `sid=${encodeURIComponent(sid)}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    'SameSite=Lax'
  ].join('; ');

  res.setHeader('Set-Cookie', cookie);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'sid=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
}

async function handleApi(req, res, pathname) {
  if (pathname === '/api/me' && req.method === 'GET') {
    const username = getSessionUser(req);
    if (!username) {
      sendJson(res, 200, { authenticated: false });
      return;
    }
    sendJson(res, 200, { authenticated: true, username });
    return;
  }

  if (pathname === '/api/register' && req.method === 'POST') {
    const body = await parseRequestBody(req);
    const username = String(body.username || '').trim();
    const password = String(body.password || '');

    if (username.length < 3) {
      sendJson(res, 400, { error: 'Username must be at least 3 characters.' });
      return;
    }
    if (password.length < 4) {
      sendJson(res, 400, { error: 'Password must be at least 4 characters.' });
      return;
    }

    const usernameKey = normalizeUsername(username);
    const db = readUsers();
    if (db.users[usernameKey]) {
      sendJson(res, 409, { error: 'Username already exists. Please login.' });
      return;
    }

    const { salt, hash } = hashPassword(password);
    db.users[usernameKey] = {
      username,
      salt,
      hash,
      createdAt: new Date().toISOString()
    };
    writeUsers(db);

    const sid = createSession(db.users[usernameKey].username);
    setSessionCookie(res, sid);
    sendJson(res, 201, { success: true, username: db.users[usernameKey].username });
    return;
  }

  if (pathname === '/api/login' && req.method === 'POST') {
    const body = await parseRequestBody(req);
    const usernameInput = String(body.username || '').trim();
    const password = String(body.password || '');

    if (!usernameInput || !password) {
      sendJson(res, 400, { error: 'Username and password are required.' });
      return;
    }

    const db = readUsers();
    const usernameKey = normalizeUsername(usernameInput);
    const userRecord = db.users[usernameKey];

    if (!verifyPassword(password, userRecord)) {
      sendJson(res, 401, { error: 'Invalid username or password.' });
      return;
    }

    const sid = createSession(userRecord.username);
    setSessionCookie(res, sid);
    sendJson(res, 200, { success: true, username: userRecord.username });
    return;
  }

  if (pathname === '/api/logout' && req.method === 'POST') {
    const cookies = getCookieMap(req);
    if (cookies.sid) {
      sessions.delete(cookies.sid);
    }
    clearSessionCookie(res);
    sendJson(res, 200, { success: true });
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
}

function serveStatic(req, res, pathname) {
  let relativePath = pathname === '/' ? '/index.html' : pathname;
  relativePath = decodeURIComponent(relativePath);
  const safePath = path.normalize(relativePath).replace(/^([.][.][/\\])+/, '');
  const fullPath = path.join(ROOT_DIR, safePath);

  if (!fullPath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(fullPath, (statErr, stats) => {
    if (statErr || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(fullPath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, pathname);
      return;
    }

    serveStatic(req, res, pathname);
  } catch (err) {
    sendJson(res, 500, { error: 'Server error', detail: err.message });
  }
});

ensureUsersFile();
server.listen(PORT, HOST, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Passwords are stored in: ${USERS_FILE}`);
});
