# Exnergistick — Plataforma completa (PayU + Nequi + usuarios)

Este paquete contiene un frontend (SPA) y un backend en Node.js/Express con SQLite para persistencia local.
Incluye:
- Registro / inicio de sesión (JWT)
- Dashboard de usuario con saldo, historial, invertir y retirar
- Integración **placeholder** para PayU (crear orden y webhook)
- Soporte para mostrar número y QR de Nequi (desde variables de entorno)
- Endpoint admin simple para ver datos (protegido por ADMIN_TOKEN)

***IMPORTANTE:*** Esto es una plantilla técnica. Para recibir dinero real necesitas configurar las pasarelas (PayU), webhooks, HTTPS y cumplir requisitos legales (KYC/AML). No uses en producción sin asesoría.

## Pasos rápidos para tenerlo listo (desde PC o móvil)

1. **Instala Node.js (v16+) y npm.** (en móvil: usa Termux en Android o despliega con servicios como Render desde el repo de GitHub)
2. **Descarga y descomprime** este ZIP.
3. En la carpeta `server/` duplica `.env.example` -> `.env` y completa las claves:
   - `JWT_SECRET` (cualquier texto fuerte)
   - `ADMIN_TOKEN` (clave para usar endpoints admin)
   - `PAYU_MERCHANT_ID`, `PAYU_API_KEY`, `PAYU_API_LOGIN`
   - `NEQUI_NUMBER` (tu número de Nequi, p.e. +57 3xx xxx xxxx)
   - `NEQUI_QR_URL` (opcional: URL pública de la imagen QR generada desde la app Nequi)
4. **Instala dependencias** desde `server/`:
```bash
npm install
```
5. **Inicia el servidor**:
```bash
npm start
```
6. Abre `http://localhost:3000/` y crea una cuenta para probar. Se creó un usuario admin por defecto:
   - email: `admin@ex.com`
   - password: `123456`
   (cámbialo en producción)

## Cómo configurar PayU (resumen)
- Crea cuenta comercial en PayU y consigue `merchantId`, `apiKey`, `apiLogin` y credenciales.
- En producción sigue la documentación oficial de PayU — firma de peticiones y validación de IPN/webhooks.
- En `server.js` hay un lugar donde generar la redirect URL para PayU; debe reemplazarse por la lógica de creación de orden firmada según PayU.

Documentación PayU: https://developers.payulatam.com/en/ (usa el panel de PayU de tu país).

## Nequi (QR y número)
- Abre app Nequi -> genera tu QR personal o de negocios -> guarda la imagen en un host público (Cloudinary, Google Drive público, Imgur, o tu servidor) y pega la URL en `NEQUI_QR_URL` dentro de `.env`.
- Alternativamente, los usuarios pueden escanear el QR directamente desde tu web si subes la imagen a través del panel de hosting o la subes al repo.

## Despliegue (recomendado)
- Subir a GitHub y conectar a **Render**, **Railway**, o **Heroku** para el backend. Configura las variables de entorno en la interfaz del servicio.
- Asegura HTTPS y configura los webhooks de PayU/Stripe apuntando a `https://tu-dominio.com/api/webhook/...`.

## ¿Se puede hacer todo desde el celular?
Sí — pasos recomendados:
- Usa GitHub desde el móvil para subir el repo.
- Conecta a Vercel/Render desde su web móvil para desplegar (estos servicios permiten configurar variables de entorno desde la interfaz móvil).
- Para ejecutar localmente en Android puedes usar Termux (instalar Node.js y npm) pero es más técnico. Para principiantes, recomiendo desplegar el repo en Render/Vercel y configurar las variables allí.

## Personalizaciones y siguientes pasos
Puedo ayudarte a:
- Integrar la creación real de órdenes con PayU (con ejemplo de firma y verificación) — necesitaré tus credenciales de prueba para probar (no las pongas en este chat).
- Subir el proyecto a un repositorio GitHub y guiarte paso a paso (con capturas) para desplegar en Render/Vercel desde el móvil.
- Preparar textos legales y KYC básico.

