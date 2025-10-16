import express from 'express';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// Configurar middlewares
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'clave-secreta-edwin',
  resave: false,
  saveUninitialized: true
}));

// Conexión a SQLite
let db;
(async () => {
  db = await open({
    filename: path.join(__dirname, 'database.db'),
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT
    );
  `);

  console.log('📦 Base de datos inicializada');
})();

// Página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Registro de usuario
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    await db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, password]);
    res.json({ ok: true, message: '✅ Usuario registrado correctamente' });
  } catch (err) {
    res.json({ ok: false, message: '❌ Ese correo ya está registrado' });
  }
});

// Inicio de sesión
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);

  if (user) {
    req.session.user = user;
    res.json({ ok: true, message: '✅ Sesión iniciada correctamente' });
  } else {
    res.json({ ok: false, message: '❌ Credenciales incorrectas' });
  }
});

// Cerrar sesión
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true, message: '👋 Sesión cerrada' });
  });
});

// Fallback para frontend (por si actualizas la página en Render)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Servidor en marcha
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en el puerto ${PORT}`);
});
