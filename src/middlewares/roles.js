function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Allow both admin and moderator for admin routes (except specific restrictions)
    if (role === 'admin' && (req.user.role === 'admin' || req.user.role === 'moderator')) {
      return next();
    }
    
    // For other roles, exact match required
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
  };
}

module.exports = requireRole;
