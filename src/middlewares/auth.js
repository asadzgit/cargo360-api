const jwt = require('jsonwebtoken');
const { jwt: jwtCfg } = require('../../config/env');

function auth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) throw Object.assign(new Error('Unauthorized'), { status: 401 });

    const payload = jwt.verify(token, jwtCfg.accessSecret);
    req.user = payload; // { id, role }
    next();
  } catch (e) {
    e.status = e.status || 401;
    next(e);
  }
}

module.exports = auth;   // ✅ direct export
