// Script para poblar la base de datos con datos iniciales
// Ejecutar UNA sola vez: node seed.js

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Iniciando seed...');

    // Config
    await client.query(`
      INSERT INTO config(key,value) VALUES('main', $1) ON CONFLICT(key) DO NOTHING
    `, [JSON.stringify({
      nombre: 'Servicios Médicos SL',
      nif: 'B12345678',
      dir: 'Calle Mayor 45, 1º A',
      ciudad: 'Barcelona',
      cp: '08001',
      email: 'admin@serviciosmedicos.es',
      tel: '934 567 890',
      iva: 0,
      pref: 'FAC'
    })]);

    await client.query(`
      INSERT INTO config(key,value) VALUES('seq', $1) ON CONFLICT(key) DO NOTHING
    `, [0]);

    // Clientes
    const clientes = [
      { id: 'c1', nombre: 'Mutua Salud SA', nif: 'A87654321', dir: 'Paseo de Gracia 100', ciudad: 'Barcelona', cp: '08008', email: 'facturas@mutuasalud.es', tel: '932 111 222' },
      { id: 'c2', nombre: 'Seguros Vida Corp', nif: 'B22334455', dir: 'Via Laietana 50', ciudad: 'Barcelona', cp: '08003', email: 'admin@segurosvida.es', tel: '933 444 555' }
    ];
    for (const c of clientes) {
      await client.query(
        'INSERT INTO clientes(id,nombre,nif,dir,ciudad,cp,email,tel) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO NOTHING',
        [c.id, c.nombre, c.nif, c.dir, c.ciudad, c.cp, c.email, c.tel]
      );
    }

    // Sucursales
    const sucursales = [
      { id: 's1', nombre: 'Centro Médico Norte', dir: 'C/ Aragón 200', resp: 'Dr. García', clientes: ['c1', 'c2'] },
      { id: 's2', nombre: 'Clínica Sur', dir: 'Av. Meridiana 80', resp: 'Dra. López', clientes: ['c1'] },
      { id: 's3', nombre: 'Consultas Este', dir: 'C/ Pallars 30', resp: 'Dr. Martínez', clientes: ['c2'] }
    ];
    for (const s of sucursales) {
      await client.query(
        'INSERT INTO sucursales(id,nombre,dir,resp,clientes) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING',
        [s.id, s.nombre, s.dir, s.resp, JSON.stringify(s.clientes)]
      );
    }

    // Actos médicos
    const actos = [
      { id: 'a1', nombre: 'Gastroscopia', cod: 'GAS001', precio: 180 },
      { id: 'a2', nombre: 'Colonoscopia', cod: 'COL001', precio: 220 },
      { id: 'a3', nombre: 'Polipectomia', cod: 'POL001', precio: 260 },
      { id: 'a4', nombre: 'Mucosectomia', cod: 'MUC001', precio: 300 },
      { id: 'a5', nombre: 'Consultas', cod: 'CON001', precio: 65 },
      { id: 'a6', nombre: 'Ecoendoscopia', cod: 'ECO001', precio: 280 },
      { id: 'a7', nombre: 'Balón gástrico', cod: 'BAL001', precio: 350 },
      { id: 'a8', nombre: 'Gastroplastia Apollo', cod: 'GAP001', precio: 450 },
      { id: 'a9', nombre: 'Gastroplastia MEGA', cod: 'GAM001', precio: 500 },
      { id: 'a10', nombre: 'Hemostasia/tatuaje/otros', cod: 'HEM001', precio: 200 },
      { id: 'a11', nombre: 'Cápsula endoscópica', cod: 'CAP001', precio: 380 }
    ];
    for (const a of actos) {
      await client.query(
        'INSERT INTO actos(id,nombre,cod,precio) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING',
        [a.id, a.nombre, a.cod, a.precio]
      );
    }

    console.log('✅ Seed completado — clientes, sucursales y actos cargados.');
    console.log('ℹ️  Los datos de ejemplo (registros y facturas de demo) NO se insertan.');
    console.log('ℹ️  Empieza a usar la app directamente con datos reales.');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => { console.error('Error en seed:', err); process.exit(1); });
