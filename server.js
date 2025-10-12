// Exnergistick backend (Node.js + Express + SQLite)
// Features: register/login with email+password+phone, JWT auth, payments upload for Nequi, admin approvals
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// DB
const DB = path.join(__dirname, 'data.db');
const dbExists = fs.existsSync(DB);
const db = new sqlite3.Database(DB);
db.serialize(()=>{
  if(!dbExists){
    db.run('CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, phone TEXT, password TEXT, balance REAL DEFAULT 0)');
    db.run('CREATE TABLE payments (id TEXT PRIMARY KEY, user_id INTEGER, provider TEXT, amount REAL, status TEXT, file TEXT, note TEXT, createdAt TEXT)');
    // create admin user (email: admin@ex.com, password: 123456) - change in production
    const salt = bcrypt.genSaltSync(8);
    const hash = bcrypt.hashSync('123456', salt);
    db.run('INSERT INTO users (name,email,phone,password,balance) VALUES (?,?,?,?,?)',['Admin','admin@ex.com','',hash,0]);
    console.log('Database initialized');
  }
});

// Helpers
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
function generateToken(user){ return jwt.sign({id:user.id,email:user.email}, JWT_SECRET, {expiresIn:'7d'}); }
function authMiddleware(req,res,next){
  const h = req.headers.authorization;
  if(!h) return res.status(401).json({error:'No autorizado'});
  const token = h.split(' ')[1];
  try { const data = jwt.verify(token, JWT_SECRET); req.user = data; next(); }
  catch(e){ return res.status(401).json({error:'Token inválido'}); }
}

// Multer uploads
const uploadDir = path.join(__dirname, 'uploads');
if(!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
  destination: (req,file,cb)=> cb(null, uploadDir),
  filename: (req,file,cb)=> cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g,'_'))
});
const upload = multer({storage});

// Routes
app.post('/api/register', (req,res)=>{
  const {name,email,phone,password} = req.body;
  if(!email||!password) return res.status(400).json({error:'Datos requeridos'});
  const salt = bcrypt.genSaltSync(8);
  const hash = bcrypt.hashSync(password, salt);
  db.run('INSERT INTO users (name,email,phone,password,balance) VALUES (?,?,?,?,?)',[name,email,phone,hash,0], function(err){
    if(err) return res.status(400).json({error:err.message});
    return res.json({ok:true, id: this.lastID});
  });
});

app.post('/api/login', (req,res)=>{
  const {email,password} = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], (err,row)=>{
    if(err) return res.status(500).json({error:err.message});
    if(!row) return res.status(400).json({error:'Usuario no encontrado'});
    if(!bcrypt.compareSync(password,row.password)) return res.status(400).json({error:'Contraseña incorrecta'});
    const token = generateToken(row);
    return res.json({token});
  });
});

app.get('/api/me', authMiddleware, (req,res)=>{
  db.get('SELECT id,name,email,phone,balance FROM users WHERE id = ?', [req.user.id], (err,row)=>{
    if(err) return res.status(500).json({error:err.message});
    if(!row) return res.status(404).json({error:'Usuario no encontrado'});
    // get payments history
    db.all('SELECT id,provider,amount,status,file,createdAt FROM payments WHERE user_id = ? ORDER BY createdAt DESC',[row.id], (err,payments)=>{
      if(err) payments = [];
      const nequi = { number: process.env.NEQUI_NUMBER || '3014808791', qr_url: process.env.NEQUI_QR_URL || null };
      return res.json({user:row, history:payments, nequi});
    });
  });
});

// Upload proof endpoint
app.post('/api/payments/upload-proof', authMiddleware, upload.single('proof'), (req,res)=>{
  const userId = req.user.id;
  const amount = Number(req.body.amount) || 0;
  const note = req.body.note || '';
  if(!req.file) return res.status(400).json({error:'No file uploaded'});
  const id = 'NEQ-' + Date.now();
  const createdAt = new Date().toISOString();
  const filePath = '/uploads/' + path.basename(req.file.path);
  db.run('INSERT INTO payments (id,user_id,provider,amount,status,file,note,createdAt) VALUES (?,?,?,?,?,?,?,?)',[id,userId,'nequi',amount,'pending',filePath,note,createdAt], function(err){
    if(err) return res.status(500).json({error:err.message});
    return res.json({ok:true, id, file: filePath, status:'pending'});
  });
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Admin endpoints
app.get('/api/admin/payments', (req,res)=>{
  const token = req.headers['x-admin-token'];
  if(token !== process.env.ADMIN_TOKEN) return res.status(401).json({error:'No autorizado'});
  db.all('SELECT * FROM payments WHERE status = ? ORDER BY createdAt DESC', ['pending'], (err,rows)=>{
    if(err) return res.status(500).json({error:err.message});
    return res.json({payments:rows});
  });
});

app.post('/api/admin/payments/:id/approve', (req,res)=>{
  const token = req.headers['x-admin-token'];
  if(token !== process.env.ADMIN_TOKEN) return res.status(401).json({error:'No autorizado'});
  const id = req.params.id;
  db.get('SELECT * FROM payments WHERE id = ?', [id], (err,row)=>{
    if(err || !row) return res.status(404).json({error:'Pago no encontrado'});
    if(row.status !== 'pending') return res.status(400).json({error:'Pago no está en pending'});
    db.run('UPDATE payments SET status = ? WHERE id = ?', ['approved', id], function(uErr){
      if(uErr) return res.status(500).json({error:uErr.message});
      db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [row.amount, row.user_id], function(upErr){
        if(upErr) return res.status(500).json({error:upErr.message});
        return res.json({ok:true, message:'Pago aprobado y saldo acreditado'});
      });
    });
  });
});

// Public: nequi QR image route (returns env QR or uploaded QR)
app.get('/api/nequi-qr', (req,res)=>{
  const qr = process.env.NEQUI_QR_PATH || null;
  if(qr && fs.existsSync(path.join(__dirname, qr))){ return res.sendFile(path.join(__dirname, qr)); }
  if(process.env.NEQUI_QR_URL) return res.redirect(process.env.NEQUI_QR_URL);
  return res.status(404).send('No QR');
});

app.get('/api/nequi', (req,res)=>{
  return res.json({number: process.env.NEQUI_NUMBER || '3014808791', qr_url: process.env.NEQUI_QR_URL || null});
});

// Fallback serve SPA
app.get('*', (req,res)=>{
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log('Server running on port', PORT));
