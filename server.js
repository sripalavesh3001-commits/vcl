require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

require('./config/db'); // initializes SQLite schema on startup

const app = express();
const PORT = process.env.PORT || 3000;

app.use(morgan('dev'));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/elements', require('./routes/elements'));
app.use('/api/lab', require('./routes/lab'));
app.use('/api/reactions', require('./routes/reactions'));
app.use('/api/calculators', require('./routes/calculators'));
app.use('/api/experiments', require('./routes/experiments'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/tutor', require('./routes/tutor'));
app.use('/api', require('./routes/misc'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fallback to index.html for any non-API route (single-page app navigation)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`\n  Virtual Chemistry Lab running at http://localhost:${PORT}\n`);
});
