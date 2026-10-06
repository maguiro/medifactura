const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const https = require('https');
const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Init DB
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

// IA PROXY — análisis de fotos y tablas
app.post('/api/ia/import', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });
  const payload = JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: req.body.messages
  });
  const options = {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Length': Buffer.byteLength(payload)
    }
  };
  const apiReq = https.request(options, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => { data += chunk; });
    apiRes.on('end', () => {
      try { res.json(JSON.parse(data)); }
      catch (e) { res.status(500).json({ error: 'Invalid response from AI' }); }
    });
  });
  apiReq.on('error', (e) => { res.status(500).json({ error: e.message }); });
  apiReq.write(payload);
  apiReq.end();
});

// PDF GENERATION — genera PDF real usando puppeteer
app.post('/api/pdf', async (req, res) => {
  try {
    const puppeteer = require('puppeteer');
    const { html, filename } = req.body;
    if (!html) return res.status(400).json({ error: 'No HTML provided' });

    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '1.5cm', right: '1.5cm', bottom: '1.5cm', left: '1.5cm' },
      printBackground: true,
      displayHeaderFooter: false
    });
    await browser.close();

    const fname = (filename || 'factura').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}.pdf"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.send(pdf);
  } catch (e) {
    console.error('PDF error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
