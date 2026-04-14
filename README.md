# MediFactura — Guía de despliegue en Railway

## Estructura de archivos

```
medifactura-backend/
├── server.js          ← El servidor backend
├── seed.js            ← Script para datos iniciales (ejecutar 1 vez)
├── package.json       ← Dependencias
├── .gitignore         ← Archivos a ignorar en Git
├── .env.example       ← Ejemplo de variables de entorno
└── public/
    └── index.html     ← La app MediFactura (frontend)
```

---

## PASO 1 — Subir a GitHub

1. Ve a **github.com** → botón verde **New** (repositorio nuevo)
2. Nombre: `medifactura` → **Create repository**
3. Abre la **Terminal** en tu Mac
4. Ejecuta estos comandos uno a uno:

```bash
cd ~/Desktop
# (arrastra la carpeta medifactura-backend a Terminal para obtener la ruta exacta)

git init
git add .
git commit -m "MediFactura inicial"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/medifactura.git
git push -u origin main
```

> ⚠️ Cambia `TU_USUARIO` por tu usuario de GitHub

---

## PASO 2 — Crear el proyecto en Railway

1. Ve a **railway.app** → **New Project**
2. Elige **Deploy from GitHub repo**
3. Conecta tu cuenta de GitHub si te lo pide
4. Selecciona el repositorio `medifactura`
5. Railway detectará automáticamente que es Node.js ✓

---

## PASO 3 — Añadir la base de datos PostgreSQL

1. En tu proyecto Railway, haz clic en **+ New**
2. Elige **Database** → **Add PostgreSQL**
3. Railway crea la base de datos y conecta automáticamente la variable `DATABASE_URL` ✓

---

## PASO 4 — Configurar variables de entorno

En Railway, ve a tu servicio (no la base de datos) → **Variables** → añade:

```
NODE_ENV = production
```

(DATABASE_URL ya la pone Railway automáticamente)

---

## PASO 5 — Obtener la URL pública

1. En Railway → tu servicio → pestaña **Settings**
2. Sección **Networking** → **Generate Domain**
3. Te dará una URL tipo: `https://medifactura-production.up.railway.app`

¡Esa es tu URL! Funciona desde cualquier dispositivo.

---

## PASO 6 — Cargar los datos iniciales (solo 1 vez)

En Railway → tu servicio → pestaña **Settings** → **Deploy** → sección **Start Command**

Cambia temporalmente el comando de inicio a:
```
node seed.js
```

Haz deploy, espera que termine, luego vuelve a poner:
```
node server.js
```

---

## Acceso desde todos tus dispositivos

Abre simplemente tu URL de Railway en cualquier navegador:
```
https://medifactura-production.up.railway.app
```

Todos los Macs, iPhone, iPad — todos ven los mismos datos en tiempo real.

---

## Backup manual

Desde la app: **Mi empresa** → botón **⬇ Descargar backup JSON**

Esto descarga un archivo JSON con todos tus datos (clientes, facturas, registros, etc.)

---

## Endpoint webhook para n8n (automatizaciones)

Para crear facturas automáticamente desde n8n:

```
POST https://tu-url.railway.app/api/webhook/factura
Content-Type: application/json

{
  "cliente_nif": "A87654321",
  "mes": "2025-04",
  "sucursal_nombre": "Centro Médico Norte",
  "lineas": [
    { "desc": "Gastroscopia", "uds": 3, "precio": 180 },
    { "desc": "Colonoscopia", "uds": 2, "precio": 220 }
  ],
  "obs": "Generado automáticamente"
}
```

---

## Soporte

Si algo no funciona, comparte el mensaje de error exacto y te ayudo.
