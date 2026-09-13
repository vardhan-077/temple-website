require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');

const connectDB = require('./config/db');
const settingsCache = require('./utils/settingsCache');
const { toISTDatetimeLocal } = require('./utils/dates');
const { formatINR } = require('./utils/money');
const { handleRazorpayWebhook } = require('./routes/webhook');

const publicRoutes = require('./routes/public');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/temple-website';

// Most hosts (Render, Railway, a Nginx-fronted VPS, etc.) sit behind a proxy.
// This makes secure cookies and rate-limiting see the real client IP/scheme.
app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Small helpers available in every EJS template without importing them each time.
app.locals.toISTDatetimeLocal = toISTDatetimeLocal;
app.locals.formatINR = formatINR;

// Security headers. NOTE: Content-Security-Policy is intentionally left off
// helmet's defaults here, because a strict CSP can silently break the
// Razorpay Checkout script/iframe if not tuned exactly right, and a broken
// donate button is worse than a missing CSP header. Once you've confirmed
// live payments work end-to-end, you can turn on a tuned CSP - see the
// README section "Tightening security before you go fully live".
app.use(helmet({ contentSecurityPolicy: false }));

// --- Razorpay webhook: MUST be registered before express.json() below,
// and needs the raw request body (not the parsed object) to verify the
// signature Razorpay sends. ---
app.post('/api/razorpay/webhook', express.raw({ type: 'application/json' }), handleRazorpayWebhook);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Everything below depends on MongoDB being reachable (the session store
 * included), so it's wired up only after connectDB() succeeds. This makes
 * a bad MONGODB_URI fail loudly and immediately on startup instead of
 * silently breaking sessions/admin login on the first request later.
 *
 * This setup is wrapped in a cached promise (see getApp() below) instead of
 * running unconditionally, so the exact same server.js works two ways:
 *  - Traditional hosts (Render, Railway, a VPS): running `node server.js`
 *    hits the `require.main === module` block at the bottom, which awaits
 *    this once and then calls app.listen() - business as usual.
 *  - Serverless hosts (Vercel): api/index.js calls getApp() on every
 *    invocation. The first (cold-start) call runs this setup and caches the
 *    result; every later call on the same warm instance reuses the same
 *    Express app and, importantly, the same MongoDB connection instead of
 *    reconnecting per-request.
 */
async function buildApp() {
  await connectDB();

  const sessionStore = MongoStore.create({ mongoUrl: MONGODB_URI, collectionName: 'sessions' });
  sessionStore.on('error', (err) => {
    // A transient session-store hiccup shouldn't crash the whole process -
    // log it and let login/session features recover on their own once the
    // database connection is healthy again.
    console.error('[session-store]', err.message);
  });

  app.use(
    session({
      name: 'temple.sid',
      secret: process.env.SESSION_SECRET || 'insecure-dev-secret-change-me',
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        httpOnly: true,
        sameSite: 'lax', // primary CSRF defense for this app's state-changing POST forms
        secure: IS_PROD, // requires HTTPS in production (true on Render/Railway/etc.)
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );
  app.use(flash());

  // Make temple settings + flash messages + logged-in admin available to
  // every view without each route having to fetch/pass them individually.
  app.use(async (req, res, next) => {
    try {
      res.locals.settings = await settingsCache.getSettings();
      res.locals.flashSuccess = req.flash('success');
      res.locals.flashError = req.flash('error');
      res.locals.currentAdminUsername = req.session.adminUsername || null;
      next();
    } catch (err) {
      next(err);
    }
  });

  app.use('/api', apiRoutes);
  app.use('/admin', adminRoutes);
  app.use('/', publicRoutes);

  // 404
  app.use((req, res) => {
    res.status(404);
    if (req.path.startsWith('/api/')) {
      return res.json({ error: 'Not found' });
    }
    res.type('html').send(
      '<!DOCTYPE html><html><head><title>Page Not Found</title></head><body style="font-family:sans-serif;text-align:center;padding:80px 20px;">' +
        '<h1 style="color:#7a1414;">404 - Page Not Found</h1><p><a href="/">Go back home</a></p></body></html>'
    );
  });

  // Error handler
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    console.error('[error]', err);
    const status = err.status || 500;
    if (req.path.startsWith('/api/')) {
      return res.status(status).json({ error: IS_PROD ? 'Something went wrong.' : err.message });
    }
    res.status(status).type('html').send(
      '<!DOCTYPE html><html><head><title>Something went wrong</title></head><body style="font-family:sans-serif;text-align:center;padding:80px 20px;">' +
        '<h1 style="color:#7a1414;">Something went wrong</h1><p>Please try again in a moment.</p><p><a href="/">Go back home</a></p></body></html>'
    );
  });

  return app;
}

// Cached so concurrent/warm invocations reuse one setup instead of racing
// to build (and connect to Mongo) multiple times. If setup fails, the cache
// is cleared so the *next* request gets a fresh attempt instead of being
// permanently stuck on one bad connection attempt.
let readyPromise = null;
function getApp() {
  if (!readyPromise) {
    readyPromise = buildApp().catch((err) => {
      readyPromise = null;
      throw err;
    });
  }
  return readyPromise;
}

// Only start a traditional long-running listener when this file is run
// directly (`node server.js` / `npm start` / `npm run dev`) - NOT when it's
// merely required by api/index.js on Vercel, which manages its own
// request/response lifecycle per invocation instead of a persistent socket.
if (require.main === module) {
  getApp()
    .then((readyApp) => {
      readyApp.listen(PORT, () => {
        console.log(`[server] Temple website running at http://localhost:${PORT}`);
        if (IS_PROD) console.log('[server] Running in production mode.');
      });
    })
    .catch((err) => {
      console.error('[server] Failed to start:', err.message);
      console.error('[server] Check that MONGODB_URI in your .env file is correct and reachable.');
      process.exit(1);
    });
}

module.exports = { app, getApp };
