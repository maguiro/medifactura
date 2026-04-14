const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// DB connection — Railway provides DATABASE_URL automatically
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ── INIT DATABASE ──────────────────────────────────────────────
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL
      );

      CREATE TABLE IF NOT EXISTS clientes (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        nif TEXT,
        dir TEXT,
        ciudad TEXT,
        cp TEXT,
        email TEXT,
        tel TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sucursales (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        dir TEXT,
        resp TEXT,
        clientes JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS actos (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        cod TEXT,
        precio NUMERIC(10,2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS registros (
        id TEXT PRIMARY KEY,
        fecha TEXT,
        sucursal TEXT,
        cliente TEXT,
        acto TEXT,
        nacto TEXT,
        uds INTEGER DEFAULT 0,
        precio NUMERIC(10,2) DEFAULT 0,
        total NUMERIC(10,2) DEFAULT 0,
        obs TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS facturas (
        id TEXT PRIMARY KEY,
        num TEXT,
        cliente TEXT,
        suc TEXT,
        mes TEXT,
        femision TEXT,
        fvenc TEXT DEFAULT '',
        estado TEXT DEFAULT 'borrador',
        sub NUMERIC(10,2) DEFAULT 0,
        ivap NUMERIC(5,2) DEFAULT 0,
        ivai NUMERIC(10,2) DEFAULT 0,
        total NUMERIC(10,2) DEFAULT 0,
        lineas JSONB DEFAULT '[]',
        obs TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Base de datos inicializada');
  } finally {
    client.release();
  }
}

// ── HELPERS ────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

// ── CONFIG ─────────────────────────────────────────────────────
app.get('/api/config', async (req, res) => {
  try {
    const r = await pool.query("SELECT value FROM config WHERE key = 'main'");
    res.json(r.rows[0]?.value || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/config', async (req, res) => {
  try {
    await pool.query(
      "INSERT INTO config(key,value) VALUES('main',$1) ON CONFLICT(key) DO UPDATE SET value=$1",
      [req.body]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/seq', async (req, res) => {
  try {
    const r = await pool.query("SELECT value FROM config WHERE key = 'seq'");
    res.json({ seq: r.rows[0]?.value || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/seq/next', async (req, res) => {
  try {
    const r = await pool.query("SELECT value FROM config WHERE key = 'seq'");
    const cur = parseInt(r.rows[0]?.value || 0);
    const next = cur + 1;
    await pool.query(
      "INSERT INTO config(key,value) VALUES('seq',$1) ON CONFLICT(key) DO UPDATE SET value=$1",
      [next]
    );
    res.json({ seq: next });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CLIENTES ───────────────────────────────────────────────────
app.get('/api/clientes', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM clientes ORDER BY nombre');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/clientes', async (req, res) => {
  try {
    const d = req.body;
    const id = d.id || uid();
    await pool.query(
      'INSERT INTO clientes(id,nombre,nif,dir,ciudad,cp,email,tel) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET nombre=$2,nif=$3,dir=$4,ciudad=$5,cp=$6,email=$7,tel=$8',
      [id, d.nombre, d.nif, d.dir, d.ciudad, d.cp, d.email, d.tel]
    );
    res.json({ id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/clientes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM clientes WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SUCURSALES ─────────────────────────────────────────────────
app.get('/api/sucursales', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM sucursales ORDER BY nombre');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/sucursales', async (req, res) => {
  try {
    const d = req.body;
    const id = d.id || uid();
    await pool.query(
      'INSERT INTO sucursales(id,nombre,dir,resp,clientes) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET nombre=$2,dir=$3,resp=$4,clientes=$5',
      [id, d.nombre, d.dir, d.resp, JSON.stringify(d.clientes || [])]
    );
    res.json({ id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/sucursales/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM sucursales WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ACTOS ──────────────────────────────────────────────────────
app.get('/api/actos', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM actos ORDER BY nombre');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/actos', async (req, res) => {
  try {
    const d = req.body;
    const id = d.id || uid();
    await pool.query(
      'INSERT INTO actos(id,nombre,cod,precio) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET nombre=$2,cod=$3,precio=$4',
      [id, d.nombre, d.cod, d.precio]
    );
    res.json({ id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/actos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM actos WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── REGISTROS ──────────────────────────────────────────────────
app.get('/api/registros', async (req, res) => {
  try {
    const { mes } = req.query;
    let q = 'SELECT * FROM registros';
    let params = [];
    if (mes) { q += ' WHERE fecha LIKE $1'; params = [mes + '%']; }
    q += ' ORDER BY fecha DESC';
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/registros', async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    for (const d of items) {
      const id = d.id || uid();
      await pool.query(
        'INSERT INTO registros(id,fecha,sucursal,cliente,acto,nacto,uds,precio,total,obs) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(id) DO UPDATE SET fecha=$2,sucursal=$3,cliente=$4,acto=$5,nacto=$6,uds=$7,precio=$8,total=$9,obs=$10',
        [id, d.fecha, d.sucursal, d.cliente, d.acto, d.nacto, d.uds, d.precio, d.total, d.obs || '']
      );
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/registros/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM registros WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── FACTURAS ───────────────────────────────────────────────────
app.get('/api/facturas', async (req, res) => {
  try {
    const { mes } = req.query;
    let q = 'SELECT * FROM facturas';
    let params = [];
    if (mes) { q += ' WHERE mes=$1'; params = [mes]; }
    q += ' ORDER BY created_at DESC';
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/facturas', async (req, res) => {
  try {
    const d = req.body;
    const id = d.id || uid();
    await pool.query(
      'INSERT INTO facturas(id,num,cliente,suc,mes,femision,fvenc,estado,sub,ivap,ivai,total,lineas,obs) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT(id) DO UPDATE SET num=$2,cliente=$3,suc=$4,mes=$5,femision=$6,fvenc=$7,estado=$8,sub=$9,ivap=$10,ivai=$11,total=$12,lineas=$13,obs=$14',
      [id, d.num, d.cliente, d.suc, d.mes, d.femision, d.fvenc || '', d.estado, d.sub, d.ivap, d.ivai, d.total, JSON.stringify(d.lineas || []), d.obs || '']
    );
    res.json({ id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/facturas/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM facturas WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── BACKUP COMPLETO ────────────────────────────────────────────
app.get('/api/backup', async (req, res) => {
  try {
    const [cfg, cli, suc, act, reg, fac] = await Promise.all([
      pool.query("SELECT value FROM config WHERE key='main'"),
      pool.query('SELECT * FROM clientes ORDER BY nombre'),
      pool.query('SELECT * FROM sucursales ORDER BY nombre'),
      pool.query('SELECT * FROM actos ORDER BY nombre'),
      pool.query('SELECT * FROM registros ORDER BY fecha DESC'),
      pool.query('SELECT * FROM facturas ORDER BY created_at DESC')
    ]);
    res.json({
      exportado: new Date().toISOString(),
      config: cfg.rows[0]?.value || {},
      clientes: cli.rows,
      sucursales: suc.rows,
      actos: act.rows,
      registros: reg.rows,
      facturas: fac.rows
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── WEBHOOK para n8n (recibir datos y crear factura automática) ──
app.post('/api/webhook/factura', async (req, res) => {
  try {
    const { cliente_nif, mes, sucursal_nombre, lineas, obs } = req.body;

    // Buscar cliente por NIF
    const cliR = await pool.query('SELECT * FROM clientes WHERE nif=$1', [cliente_nif]);
    if (!cliR.rows.length) return res.status(404).json({ error: 'Cliente no encontrado: ' + cliente_nif });
    const cli = cliR.rows[0];

    // Buscar sucursal por nombre
    const sucR = await pool.query('SELECT * FROM sucursales WHERE nombre ILIKE $1', [sucursal_nombre || '%']);
    const suc = sucR.rows[0] || { id: '' };

    // Calcular totales
    const cfg = (await pool.query("SELECT value FROM config WHERE key='main'")).rows[0]?.value || {};
    const ivap = cfg.iva || 0;
    const lineasCalc = (lineas || []).map(l => ({ ...l, total: (l.uds || 0) * (l.precio || 0) }));
    const sub = lineasCalc.reduce((s, l) => s + l.total, 0);
    const ivai = sub * ivap / 100;

    // Número de factura
    const seqR = await pool.query("SELECT value FROM config WHERE key='seq'");
    const seq = parseInt(seqR.rows[0]?.value || 0) + 1;
    await pool.query("INSERT INTO config(key,value) VALUES('seq',$1) ON CONFLICT(key) DO UPDATE SET value=$1", [seq]);
    const num = (cfg.pref || 'FAC') + '-' + new Date().getFullYear() + '-' + ('000' + seq).slice(-4);

    const id = uid();
    await pool.query(
      'INSERT INTO facturas(id,num,cliente,suc,mes,femision,estado,sub,ivap,ivai,total,lineas,obs) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
      [id, num, cli.id, suc.id, mes || new Date().toISOString().slice(0, 7), new Date().toISOString().slice(0, 10), 'borrador', sub, ivap, ivai, sub + ivai, JSON.stringify(lineasCalc), obs || '']
    );

    res.json({ ok: true, id, num, total: sub + ivai, cliente: cli.nombre });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── HEALTH CHECK ───────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ── START ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
initDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 MediFactura backend corriendo en puerto ${PORT}`));
}).catch(err => {
  console.error('Error iniciando BD:', err);
  process.exit(1);
});
