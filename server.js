// Importar dependencias
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Configurar entorno
dotenv.config();

// Inicializar la app
const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de rutas y archivos públicos
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/public", express.static(path.join(__dirname, "public")));

// Ruta principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
