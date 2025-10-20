// ==========================
// SERVIDOR EXNERGISTICK
// ==========================

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

// --------------------------
// CONFIGURACIÓN DEL SERVIDOR
// --------------------------
const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --------------------------
// CONEXIÓN A POSTGRESQL
// --------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://exnergistick_db_user:bStY7Pua4sFCkSneECTvAlhIpPjJHjjD@dpg-d3qq94gdl3ps73c5bsn0-a/exnergistick_db",
  ssl: { rejectUnauthorized: false },
});

// --------------------------
// MIDDLEWARE
// --------------------------
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// --------------------------
// TABLAS (se crean si no existen)
// --------------------------
const createTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      balance_usd NUMERIC DEFAULT 0,
      balance_cop NUMERIC DEFAULT 0
    )
  `);
};
createTables();

// --------------------------
// RUTAS
// --------------------------

// Registrar usuario
app.post("/api/register", async (req, res) => {
  const { nombre, email, password } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO users (nombre, email, password) VALUES ($1, $2, $3) RETURNING *",
      [nombre, email, password]
    );
    res.status(201).json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("Error al registrar usuario:", err);
    res.status(500).json({ success: false, message: "Error al registrar usuario" });
  }
});

// Iniciar sesión
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND password = $2",
      [email, password]
    );
    if (result.rows.length > 0) {
      res.json({ success: true, user: result.rows[0] });
    } else {
      res.status(401).json({ success: false, message: "Correo o contraseña incorrectos" });
    }
  } catch (err) {
    console.error("Error al iniciar sesión:", err);
    res.status(500).json({ success: false, message: "Error en el servidor" });
  }
});

// Obtener balance
app.get("/api/balance/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT balance_usd, balance_cop FROM users WHERE id = $1", [id]);
    res.json({ success: true, balance: result.rows[0] });
  } catch (err) {
    console.error("Error al obtener balance:", err);
    res.status(500).json({ success: false, message: "Error al obtener balance" });
  }
});

// --------------------------
// FALLBACK AL FRONTEND
// --------------------------
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --------------------------
// INICIAR SERVIDOR
// --------------------------
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
