const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole =
      req.user?.role_code ||
      req.user?.roleCode ||
      req.user?.role ||
      null;

    if (!req.user || !userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập chức năng này' });
    }

    next();
  };
};

module.exports = roleMiddleware;