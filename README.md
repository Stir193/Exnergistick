Exnergistick Backend READY
=========================

Contenido:
- frontend/ (simple SPA que interactúa con backend)
- server/ (Node.js + Express backend con SQLite)
  - server.js
  - package.json
  - .env.example

Características incluidas:
- Registro con nombre, email, teléfono y contraseña (bcrypt)
- Login con JWT
- Endpoint /api/me para obtener perfil y saldo
- Upload de comprobantes (Nequi) y almacenamiento en /server/uploads
- Admin endpoints para ver/aprobar pagos (usa ADMIN_TOKEN header)
- Servir QR de Nequi desde NEQUI_QR_URL o archivo local (NEQUI_QR_PATH)

Instrucciones rápidas:
1) Descomprime este ZIP y sube todo el contenido a tu repositorio GitHub (en la raíz).
2) En Render crea Web Service y apunta al root (no pongas 'server' en Root Directory).
   - Build Command: npm install
   - Start Command: npm start
3) En Render agrega variables de entorno (Settings -> Environment):
   - JWT_SECRET, ADMIN_TOKEN, NEQUI_NUMBER, NEQUI_QR_URL or NEQUI_QR_PATH
4) Despliega. El servidor inicializará sqlite database automáticamente.
5) Admin: usa header x-admin-token: <ADMIN_TOKEN> para listar pagos y aprobar.

Notas:
- En producción, cambia los secrets y guarda las imágenes en un storage (Cloudinary, S3).
- No compartas claves secretas en chats públicos.
