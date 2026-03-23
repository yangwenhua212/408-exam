module.exports = (req, res, next) => {
  if (req.user && req.user.username === 'admin') {
    next();
  } else {
    res.status(403).json({ error: '需要管理员权限' });
  }
};