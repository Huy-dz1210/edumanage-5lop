/** LỚP 1 – PRESENTATION: ghi log thời gian xử lý request API (hỗ trợ theo dõi hiệu năng – NFR01). */
module.exports = function requestLogger(req, res, next) {
  if (!req.path.startsWith('/api')) return next();
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms`);
    }
  });
  next();
};
