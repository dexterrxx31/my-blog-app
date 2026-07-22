function requireAuth(req, res, next) {
  if (req.session.userId) return next();
  req.session.returnTo = req.originalUrl;
  return res.redirect("/admin/login");
}

module.exports = { requireAuth };
