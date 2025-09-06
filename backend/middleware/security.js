// backend/middleware/security.js
// Lightweight security middlewares: transaction logger, mock KYC, and rate limiter

const DEFAULT_WHITELIST = [
  // Demo wallets (lowercased). Replace via env KYC_WHITELIST or extend here
];

function parseWhitelist() {
  const fromEnv = process.env.KYC_WHITELIST || '';
  const list = fromEnv
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  return list.length ? list : DEFAULT_WHITELIST;
}

function extractWallet(req) {
  // Prefer explicit header, then body, query, and params
  const header = (req.headers['x-wallet-address'] || '').toString();
  const body = req.body && (req.body.address || req.body.wallet || req.body.walletAddress);
  const query = req.query && (req.query.address || req.query.wallet || req.query.walletAddress);
  const params = req.params && (req.params.address || req.params.wallet || req.params.walletAddress);
  const val = header || body || query || params || '';
  return typeof val === 'string' ? val.toLowerCase() : '';
}

// Transaction logger: logs every request with timestamp and wallet
function txLogger(req, res, next) {
  const wallet = extractWallet(req);
  const ts = new Date().toISOString();
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
  console.log(`🧾 [TX] ${ts} ${req.method} ${req.originalUrl} | ip=${ip} wallet=${wallet || 'n/a'}`);
  next();
}

// Mock KYC check: allow only whitelisted wallets (if a wallet is provided)
function kycCheck(req, res, next) {
  try {
    const wallet = extractWallet(req);
    if (!wallet) return next(); // if no wallet provided, do not block generic routes

    const whitelist = parseWhitelist();
    if (whitelist.includes(wallet)) return next();

    return res.status(403).json({
      success: false,
      error: 'KYC verification failed: wallet not whitelisted',
      wallet,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'KYC middleware error' });
  }
}

// Simple in-memory rate limiter by (ip + wallet)
function createRateLimiter({ windowMs = 60_000, max = 120 } = {}) {
  const hits = new Map(); // key -> { count, resetAt }

  function cleanup(now = Date.now()) {
    for (const [key, v] of hits) {
      if (now >= v.resetAt) hits.delete(key);
    }
  }

  return function rateLimiter(req, res, next) {
    const now = Date.now();
    cleanup(now);

    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '').toString();
    const wallet = extractWallet(req) || 'n/a';
    const key = `${ip}|${wallet}`;

    let entry = hits.get(key);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;
    if (entry.count > max) {
      const retry = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', retry);
      return res.status(429).json({ success: false, error: 'Too many requests', retryAfterSeconds: retry });
    }

    next();
  };
}

// Default limiter using env or sensible defaults
function buildDefaultLimiter() {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
  const max = parseInt(process.env.RATE_LIMIT_MAX || '120', 10);
  return createRateLimiter({ windowMs, max });
}

module.exports = {
  txLogger,
  kycCheck,
  createRateLimiter,
  rateLimiter: buildDefaultLimiter(),
};
