const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { signupSchema, loginSchema } = require('../validation/auth.schema');
const { jwt: jwtCfg } = require('../../config/env');
const { User } = require('../../models/index');

const signTokens = (user) => {
  const payload = { id: user.id, role: user.role };
  const accessToken = jwt.sign(payload, jwtCfg.accessSecret, { expiresIn: jwtCfg.accessExpires });
  const refreshToken = jwt.sign(payload, jwtCfg.refreshSecret, { expiresIn: jwtCfg.refreshExpires });
  return { accessToken, refreshToken };
};

exports.signup = async (req, res, next) => {
  try {
    const data = await signupSchema.validateAsync(req.body, { stripUnknown: true });
    const exists = await User.findOne({ where: { email: data.email } });
    if (exists) return next(Object.assign(new Error('Email already in use'), { status: 409 }));

    const passwordHash = await bcrypt.hash(data.password, 10);
    const role = data.role; // 'customer' | 'trucker' (admin seeded only)
    const isApproved = role === 'trucker' ? false : true;

    const user = await User.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash,
      role,
      isApproved
    });

    const tokens = signTokens(user);
    res.status(201).json({ user: { id: user.id, name: user.name, role: user.role, isApproved: user.isApproved }, ...tokens });
  } catch (e) { next(e); }
};

exports.login = async (req, res, next) => {
  try {
    const data = await loginSchema.validateAsync(req.body, { stripUnknown: true });
    const user = await User.findOne({ where: { email: data.email } });
    if (!user) return next(Object.assign(new Error('Invalid credentials'), { status: 401 }));
    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) return next(Object.assign(new Error('Invalid credentials'), { status: 401 }));
    if (user.role === 'trucker' && !user.isApproved) {
      return next(Object.assign(new Error('Trucker not approved by admin yet'), { status: 403 }));
    }
    const tokens = signTokens(user);
    res.json({ user: { id: user.id, name: user.name, role: user.role, isApproved: user.isApproved }, ...tokens });
  } catch (e) { next(e); }
};

exports.me = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: ['id','name','email','phone','role','isApproved'] });
    res.json({ user });
  } catch (e) { next(e); }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return next(Object.assign(new Error('No refresh token'), { status: 400 }));
    const payload = jwt.verify(refreshToken, jwtCfg.refreshSecret);
    const user = await User.findByPk(payload.id);
    if (!user) return next(Object.assign(new Error('User not found'), { status: 404 }));
    const tokens = ((u)=> {
      const p = { id: u.id, role: u.role };
      return {
        accessToken: jwt.sign(p, jwtCfg.accessSecret, { expiresIn: jwtCfg.accessExpires }),
        refreshToken: jwt.sign(p, jwtCfg.refreshSecret, { expiresIn: jwtCfg.refreshExpires })
      };
    })(user);
    res.json(tokens);
  } catch (e) { next(e); }
};
