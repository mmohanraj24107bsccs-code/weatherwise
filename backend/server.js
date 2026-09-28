require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const { connectDB, dbIsConnected } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();

// --- Security & parsing middleware ---
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(mongoSanitize()); // strips $ and . operators to prevent NoSQL injection
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: (Number(process.env.RATE_LIMIT_WINDOW_MINUTES) || 15) * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests - please try again later.' },
});
app.use('/api', limiter);

// --- Routes ---
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'weatherwise-api',
    dbConnected: dbIsConnected(),
    mode: dbIsConnected() ? 'live' : 'fallback',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/ai', aiRoutes);

// --- Error handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Weatherwise API listening on port ${PORT} (MongoDB mode)`);
  });
}

start();

module.exports = app;
