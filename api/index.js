/**
 * Vercel serverless entry point. Vercel automatically turns any file under
 * /api into a serverless function, so this one file handles every request
 * (see the catch-all rewrite in vercel.json) by delegating to the same
 * Express app used for `npm start` locally or on Render.
 *
 * getApp() connects to MongoDB and wires up routes on the first (cold-start)
 * call, then caches that for subsequent warm invocations - see the comment
 * above buildApp() in ../server.js for the full explanation.
 */
const { getApp } = require('../server');

module.exports = async (req, res) => {
  const app = await getApp();
  app(req, res);
};
