// Protects every route it's mounted in front of - redirects to the admin
// login page if there's no logged-in admin in the session.
function requireAdminAuth(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  req.flash('error', 'Please log in to continue.');
  return res.redirect('/admin/login');
}

// Sends already-logged-in admins straight to the dashboard instead of
// showing them the login form again.
function redirectIfLoggedIn(req, res, next) {
  if (req.session && req.session.adminId) {
    return res.redirect('/admin');
  }
  return next();
}

module.exports = { requireAdminAuth, redirectIfLoggedIn };
