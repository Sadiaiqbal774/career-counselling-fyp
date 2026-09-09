const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
require('dotenv').config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/, '');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload.isAdmin) return res.status(403).json({ message: 'Administrator access required.' });
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ message: 'Administrator authentication required.' });
  }
}

async function getUniversity(id) {
  const result = await db.query(`
    SELECT u.id, u.name, u.city, u.province, u.sector, u.website_url,
      COALESCE(json_agg(json_build_object('id', p.id, 'degree_name', p.degree_name, 'merit_formula', p.merit_formula) ORDER BY p.id) FILTER (WHERE p.id IS NOT NULL), '[]') AS programs
    FROM universities u LEFT JOIN programs p ON p.university_id = u.id
    WHERE u.id = $1 GROUP BY u.id
  `, [id]);
  return result.rows[0];
}

router.use(requireAdmin);

router.get('/universities', async (_req, res) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.name, u.city, u.province, u.sector, u.website_url,
        COALESCE(json_agg(json_build_object('id', p.id, 'degree_name', p.degree_name, 'merit_formula', p.merit_formula) ORDER BY p.id) FILTER (WHERE p.id IS NOT NULL), '[]') AS programs
      FROM universities u LEFT JOIN programs p ON p.university_id = u.id
      GROUP BY u.id ORDER BY u.name
    `);
    return res.json({ records: result.rows });
  } catch (error) { return res.status(500).json({ message: error.message }); }
});

router.post('/universities', async (req, res) => {
  const { name, city = '', province = '', sector = 'Public', website_url = '' } = req.body || {};
  if (!name) return res.status(400).json({ message: 'University name is required.' });
  try {
    const result = await db.query('INSERT INTO universities (name, city, province, sector, website_url) VALUES ($1, $2, $3, $4, $5) RETURNING id', [name.trim(), city, province, sector, website_url]);
    return res.status(201).json({ record: await getUniversity(result.rows[0].id) });
  } catch (error) { return res.status(error.code === '23505' ? 409 : 500).json({ message: error.code === '23505' ? 'A university with that name already exists.' : error.message }); }
});

router.put('/universities/:id', async (req, res) => {
  const { name, city = '', province = '', sector = 'Public', website_url = '' } = req.body || {};
  if (!name) return res.status(400).json({ message: 'University name is required.' });
  try {
    const result = await db.query('UPDATE universities SET name = $1, city = $2, province = $3, sector = $4, website_url = $5 WHERE id = $6 RETURNING id', [name.trim(), city, province, sector, website_url, req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'University not found.' });
    return res.json({ record: await getUniversity(result.rows[0].id) });
  } catch (error) { return res.status(error.code === '23505' ? 409 : 500).json({ message: error.code === '23505' ? 'A university with that name already exists.' : error.message }); }
});

router.delete('/universities/:id', async (req, res) => {
  const result = await db.query('DELETE FROM universities WHERE id = $1', [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ message: 'University not found.' });
  return res.json({ message: 'University deleted successfully.' });
});

router.post('/universities/:id/programs', async (req, res) => {
  const { degree_name, merit_formula = null } = req.body || {};
  if (!degree_name) return res.status(400).json({ message: 'Degree name is required.' });
  const result = await db.query('INSERT INTO programs (university_id, degree_name, merit_formula) VALUES ($1, $2, $3) RETURNING id, degree_name, merit_formula', [req.params.id, degree_name, merit_formula]);
  return res.status(201).json({ program: result.rows[0] });
});

router.put('/universities/:id/programs/:programId', async (req, res) => {
  const { degree_name, merit_formula = null } = req.body || {};
  const result = await db.query('UPDATE programs SET degree_name = $1, merit_formula = $2 WHERE id = $3 AND university_id = $4 RETURNING id, degree_name, merit_formula', [degree_name, merit_formula, req.params.programId, req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ message: 'Program not found.' });
  return res.json({ program: result.rows[0] });
});

router.delete('/universities/:id/programs/:programId', async (req, res) => {
  const result = await db.query('DELETE FROM programs WHERE id = $1 AND university_id = $2', [req.params.programId, req.params.id]);
  if (!result.rowCount) return res.status(404).json({ message: 'Program not found.' });
  return res.json({ message: 'Program deleted successfully.' });
});

module.exports = router;
