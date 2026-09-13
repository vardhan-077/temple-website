const Settings = require('../models/Settings');

// Settings are read on almost every page view but change rarely (only when
// the admin saves the Settings form), so we keep one copy in memory instead
// of hitting the database on every request. Call invalidate() any time the
// admin panel writes to the Settings collection.
let cached = null;

async function getSettings() {
  if (!cached) {
    cached = await Settings.getSiteSettings();
  }
  return cached;
}

function invalidate() {
  cached = null;
}

module.exports = { getSettings, invalidate };
