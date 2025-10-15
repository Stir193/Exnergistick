const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB = path.join(__dirname, 'data.db');
const dbExists = fs.existsSync(DB);
const db = new sqlite3.Database(DB);
db.serialize(()=>{
  if(!dbExists){
    db.run('CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, phone TEXT, password TEXT, balance REAL DEFAULT 0)');
    db.run('CREATE TABLE investments (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, plan TEXT, amount REAL, status TEXT, createdAt TEXT)');
    db.run('CREATE TABLE withdrawals (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, amount REAL, account TEXT, status TEXT, createdAt TEXT)');
    db.run('CREATE TABLE payments (id TEXT PRIMARY KEY, user_id INTEGER, provider TEXT, amount REAL, status TEXT, file TEXT, note TEXT, createdAt TEXT)');
    const salt = bcrypt.genSaltSync(8);
    const hash = bcrypt.hashSync('admin1234', salt);
    db.run('INSERT INTO users (name,email,phone,password,balance) VALUES (?,?,?,?,?)',['Admin','admin@ex.com','',hash,0]);
    console.log('Database initialized');
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
function generateToken(user){ return jwt.sign({id:user.id,email:user.email}, JWT_SECRET, {expiresIn:'7d'}); }
function authMiddleware(req,res,next){
  const h = req.headers.authorization;
  if(!h) return res.status(401).json({error:'No autorizado'});
  const token = h.split(' ')[1];
  try { const data = jwt.verify(token, JWT_SECRET); req.user = data; next(); }
  catch(e){ return res.status(401).json({error:'Token inválido'}); }
}

// multer for proofs
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
    return res.json({token, user:{id:row.id,name:row.name,email:row.email,phone:row.phone,balance:row.balance}});
  });
});

app.get('/api/me', authMiddleware, (req,res)=>{
  db.get('SELECT id,name,email,phone,balance FROM users WHERE id = ?', [req.user.id], (err,row)=>{
    if(err) return res.status(500).json({error:err.message});
    if(!row) return res.status(404).json({error:'Usuario no encontrado'});
    db.all('SELECT id,plan,amount,status,createdAt FROM investments WHERE user_id = ? ORDER BY createdAt DESC',[row.id], (err,invests)=>{
      if(err) invests = [];
      db.all('SELECT id,amount,status,createdAt FROM withdrawals WHERE user_id = ? ORDER BY createdAt DESC',[row.id], (err,withdraws)=>{
        if(err) withdraws = [];
        const nequi = { number: process.env.NEQUI_NUMBER || '3014808791', qr_url: process.env.NEQUI_QR_URL || null };
        return res.json({user:row, investments:invests, withdrawals:withdraws, nequi});
      });
    });
  });
});

// create investment (user must be logged in)
app.post('/api/invest', authMiddleware, (req,res)=>{
  const {plan,amount} = req.body;
  if(!plan||!amount) return res.status(400).json({error:'Datos requeridos'});
  const createdAt = new Date().toISOString();
  db.run('INSERT INTO investments (user_id,plan,amount,status,createdAt) VALUES (?,?,?,?,?)',[req.user.id,plan,amount,'pending',createdAt], function(err){
    if(err) return res.status(500).json({error:err.message});
    return res.json({ok:true, id: this.lastID, status:'pending'});
  });
});

// upload proof (after payment)
app.post('/api/payments/upload-proof', authMiddleware, upload.single('proof'), (req,res)=>{
  const userId = req.user.id;
  const amount = Number(req.body.amount) || 0;
  if(!req.file) return res.status(400).json({error:'No file uploaded'});
  const id = 'NEQ-' + Date.now();
  const createdAt = new Date().toISOString();
  const filePath = '/uploads/' + path.basename(req.file.path);
  db.run('INSERT INTO payments (id,user_id,provider,amount,status,file,note,createdAt) VALUES (?,?,?,?,?,?,?,?)',[id,userId,'nequi',amount,'pending',filePath,'',createdAt], function(err){
    if(err) return res.status(500).json({error:err.message});
    return res.json({ok:true, id, file: filePath, status:'pending'});
  });
});

// withdraw request
app.post('/api/withdraw', authMiddleware, (req,res)=>{
  const {amount,account} = req.body;
  if(!amount||!account) return res.status(400).json({error:'Datos requeridos'});
  const createdAt = new Date().toISOString();
  db.run('INSERT INTO withdrawals (user_id,amount,account,status,createdAt) VALUES (?,?,?,?,?)',[req.user.id,amount,account,'pending',createdAt], function(err){
    if(err) return res.status(500).json({error:err.message});
    return res.json({ok:true, id:this.lastID, status:'pending'});
  });
});

// admin: list pending payments or withdrawals (protected with ADMIN_TOKEN header)
app.get('/api/admin/pending', (req,res)=>{
  const token = req.headers['x-admin-token'];
  if(token !== process.env.ADMIN_TOKEN) return res.status(401).json({error:'No autorizado'});
  db.all('SELECT * FROM payments WHERE status = ? ORDER BY createdAt DESC', ['pending'], (err,payments)=>{
    if(err) payments = [];
    db.all('SELECT * FROM withdrawals WHERE status = ? ORDER BY createdAt DESC', ['pending'], (err,withdraws)=>{
      if(err) withdraws = [];
      return res.json({payments, withdraws});
    });
  });
});

// approve payment
app.post('/api/admin/payments/:id/approve', (req,res)=>{
  const token = req.headers['x-admin-token'];
  if(token !== process.env.ADMIN_TOKEN) return res.status(401).json({error:'No autorizado'});
  const id = req.params.id;
  db.get('SELECT * FROM payments WHERE id = ?', [id], (err,row)=>{
    if(err||!row) return res.status(404).json({error:'Pago no encontrado'});
    if(row.status!=='pending') return res.status(400).json({error:'Pago no está en pending'});
    db.run('UPDATE payments SET status = ? WHERE id = ?', ['approved', id], function(uErr){
      if(uErr) return res.status(500).json({error:uErr.message});
      db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [row.amount, row.user_id], function(upErr){
        if(upErr) return res.status(500).json({error:upErr.message});
        return res.json({ok:true, message:'Pago aprobado y saldo acreditado'});
      });
    });
  });
});

// approve withdrawal (admin)
app.post('/api/admin/withdrawals/:id/approve', (req,res)=>{
  const token = req.headers['x-admin-token'];
  if(token !== process.env.ADMIN_TOKEN) return res.status(401).json({error:'No autorizado'});
  const id = req.params.id;
  db.get('SELECT * FROM withdrawals WHERE id = ?', [id], (err,row)=>{
    if(err||!row) return res.status(404).json({error:'Solicitud no encontrada'});
    if(row.status!=='pending') return res.status(400).json({error:'No está en pending'});
    db.run('UPDATE withdrawals SET status = ? WHERE id = ?', ['approved', id], function(uErr){
      if(uErr) return res.status(500).json({error:uErr.message});
      return res.json({ok:true, message:'Retiro aprobado'});
    });
  });
});

app.get('/api/nequi', (req,res)=>{
  return res.json({number: process.env.NEQUI_NUMBER || '3014808791', qr_url: process.env.NEQUI_QR_URL || null});
});

// serve uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Fallback para el frontend (muestra index.html en cualquier ruta)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Puerto del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port', PORT));
