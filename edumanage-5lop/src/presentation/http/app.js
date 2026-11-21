/** LỚP 1 – PRESENTATION: khởi tạo web server Express (giao diện web + API). */
const path = require('path');
const express = require('express');
const session = require('express-session');
const config = require('../../config');
const { securityHeaders, csrfGuard } = require('./middlewares/security');
const { notFoundApi, errorHandler } = require('./middlewares/errorHandler');
const requestLogger = require('./middlewares/requestLogger');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.isProd) app.set('trust proxy', 1);

  app.use(securityHeaders);
  app.use(requestLogger);
  app.use(express.json({ limit: '200kb' }));
  app.use(
    session({
      name: 'edumanage.sid',
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: { httpOnly: true, sameSite: 'lax', secure: config.cookieSecure, maxAge: config.sessionMaxAgeMs },
    })
  );

  app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
  app.use('/api', csrfGuard, require('./routes'));
  app.use('/api', notFoundApi);

  // Giao diện người dùng (HTML/CSS/JS)
  app.get('/', (req, res) => res.redirect('/login.html'));
  app.use(express.static(PUBLIC_DIR, { extensions: ['html'], maxAge: config.isProd ? '1h' : 0 }));

  app.use(errorHandler);
  return app;
}

module.exports = createApp;
