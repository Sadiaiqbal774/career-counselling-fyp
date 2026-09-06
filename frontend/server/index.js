const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const adminUniversityRoutes = require('./routes/adminUniversities');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminUniversityRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(port, () => console.log(`Auth API listening on ${port}`));
