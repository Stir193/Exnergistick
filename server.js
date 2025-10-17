import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// === Configuración estática ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// === Conexión a MongoDB ===
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch((err) => console.error("❌ Error de conexión:", err));

// === Esquema de usuario ===
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  password: String,
});

const User = mongoose.model("User", userSchema);

// === Registro ===
app.post("/api/register", async (req, res) => {
  const { name, email, phone, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, phone, password: hashed });
    await newUser.save();
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 11000) {
      res.json({ error: "El correo ya está registrado" });
    } else {
      res.json({ error: "Error al registrar usuario" });
    }
  }
});

// === Login ===
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.json({ error: "Usuario no encontrado" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.json({ error: "Contraseña incorrecta" });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
  res.json({ token });
});

// === Ruta protegida de ejemplo ===
app.get("/api/protected", (req, res) => {
  res.json({ msg: "Ruta protegida activa ✅" });
});

// === Iniciar servidor ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
