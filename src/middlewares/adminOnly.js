// Middleware to ensure only admin role (not moderator) can access certain routes
function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Access denied. Admin role required.',
      code: 4003,
      status: 403
    });
  }
  next();
}

module.exports = adminOnly;
