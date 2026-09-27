// server.js
// Entry point for the Beyond the Resume backend API.

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');

const projectRoutes = require('./routes/projectRoutes');
const githubRoutes = require('./routes/githubRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const commentRoutes = require('./routes/commentRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// ---- Security & core middleware ----
app.use(helmet());
app.use(cors()); // for local development; restrict origins in production
app.use(express.json({ limit: '1mb' })); // cap JSON body size (protects against huge payloads)

// A gentle global rate limit; individual heavy routes (upload/AI) have their own stricter limits.
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { success: false, message: 'Too many requests. Please slow down.' }
  })
);

// ---- Routes ----
app.use('/api/auth', authRoutes);
app.use('/api/projects/:id/feedback', feedbackRoutes);
app.use('/api/projects/:id/comments', commentRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/github', githubRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Beyond the Resume API is running.' });
});

// ---- 404 handler ----
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ---- Central error handler (catches anything thrown/passed to next()) ----
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Something went wrong on the server.'
  });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
