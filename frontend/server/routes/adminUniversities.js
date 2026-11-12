const express = require('express');

const router = express.Router();

router.use((_req, res) => {
  res.status(410).json({
    message: 'Legacy Express administration is disabled. Use the Supabase-authenticated Flask API.',
  });
});

module.exports = router;
