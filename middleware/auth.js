// Login has been removed from this app. Every request is treated as the
// single built-in demo account so all previously authenticated features
// keep working without a sign-in step. There's just one normal user now —
// no teacher/admin roles.
const DEMO_USER = { id: 1, name: 'Guest User', email: 'guest@vchemlab.local' };

function requireAuth(req, res, next) {
  req.user = DEMO_USER;
  next();
}

function optionalAuth(req, res, next) {
  req.user = DEMO_USER;
  next();
}

module.exports = { requireAuth, optionalAuth, DEMO_USER };
