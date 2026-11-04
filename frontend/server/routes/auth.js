const express = require('express');

const router = express.Router();

router.use((_req, res) => {
  res.status(410).json({
    message: 'Legacy authentication is disabled. Use Supabase Auth.',
  });
});

module.exports = router;
