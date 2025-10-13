Exnergistick - Full package (frontend + backend)
------------------------------------------------

Contenido:
- server.js (Express backend with SQLite)
- package.json
- /public (frontend files: index.html, style.css, app.js)
- /uploads (will be created on first run)

Cómo desplegar en Render:
1. Subir todos los archivos a tu repositorio (raíz).
2. En Render, crea Web Service apuntando al repo (Root directory: .).
3. Build command: npm install
4. Start command: npm start
5. Añadir variables de entorno en Render:
   - JWT_SECRET (cadena larga)
   - ADMIN_TOKEN (clave para admin APIs)
   - NEQUI_NUMBER (3014808791)
   - NEQUI_QR_URL (opcional)
6. Deploy.

Admin:
- Usa el header x-admin-token: <ADMIN_TOKEN> para endpoints admin (ver/aprobar pagos y retiros).
