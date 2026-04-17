const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:WHPsTLCflpVELucRYnoPtolkNVnpTMWc@monorail.proxy.rlwy.net:46721/railway',
  ssl: { rejectUnauthorized: false }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Init tables
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_data (
      key VARCHAR(100) PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('DB ready');
}

// GET all data
app.get('/api/data', async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM app_data');
    const data = {};
    result.rows.forEach(row => { data[row.key] = row.value; });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET single key
app.get('/api/data/:key', async (req, res) => {
  try {
    const result = await pool.query('SELECT value FROM app_data WHERE key=$1', [req.params.key]);
    if (result.rows.length === 0) return res.json(null);
    res.json(result.rows[0].value);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// SET key
app.post('/api/data/:key', async (req, res) => {
  try {
    await pool.query(`
      INSERT INTO app_data (key, value, updated_at) VALUES ($1, $2, NOW())
      ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()
    `, [req.params.key, JSON.stringify(req.body.value)]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE key
app.delete('/api/data/:key', async (req, res) => {
  try {
    await pool.query('DELETE FROM app_data WHERE key=$1', [req.params.key]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE all
app.delete('/api/data', async (req, res) => {
  try {
    await pool.query('DELETE FROM app_data');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
