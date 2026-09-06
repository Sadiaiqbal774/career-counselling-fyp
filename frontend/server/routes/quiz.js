const express = require('express');
const axios = require('axios');
const router = express.Router();
require('dotenv').config();

const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:5000';

/**
 * POST /api/quiz/predict
 * Forwards quiz answers to Flask model, returns career prediction + university matches
 */
router.post('/predict', async (req, res) => {
  try {
    const quizAnswers = req.body;

    // Forward request to Flask API
    const response = await axios.post(`${FLASK_API_URL}/predict`, quizAnswers);

    res.json(response.data);
  } catch (error) {
    console.error('Quiz prediction error:', error.message);

    // Handle Flask API errors gracefully
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    res.status(503).json({
      message: 'Model service unavailable. Ensure Flask is running on port 5000.',
      error: error.message,
    });
  }
});

/**
 * GET /api/quiz/encoders
 * Returns valid background values for dropdown validation
 */
router.get('/encoders', async (req, res) => {
  try {
    const response = await axios.get(`${FLASK_API_URL}/encoders`);
    res.json(response.data);
  } catch (error) {
    console.error('Encoders error:', error.message);
    res.status(503).json({ message: 'Model service unavailable' });
  }
});

module.exports = router;
