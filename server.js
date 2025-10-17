// server.js (CommonJS)
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // en producción usar secure: true si HTTPS
}));

// DB setup (archivo data.db en la raíz)
const DB = path.join(__dirname, 'data.db');
const dbExists = fs.existsSync(DB);
const db = new sqlite3.Database(DB);
db.serialize(() => {
  if (!dbExists) {
    db.run(`CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      phone TEXT,
      password TEXT,
      balance REAL DEFAULT 0
    )`);
    db.run(`CREATE TABLE investments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      plan TEXT,
      amount REAL,
      status TEXT,
      createdAt TEXT
    )`);
    db.run(`CREATE TABLE withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      amount REAL,
      account TEXT,
      status TEXT,
      createdAt TEXT
    )`);
    db.run(`CREATE TABLE payments (
      id TEXT PRIMARY KEY,
      user_id INTEGER,
      provider TEXT,
      amount REAL,
      status TEXT,
      file TEXT,
      note TEXT,
      createdAt TEXT
    )`);
    // admin user (contraseña: admin1234) - puedes cambiarla
    const salt = bcrypt.genSaltSync(8);
    const hash = bcrypt.hashSync('admin1234', salt);
    db.run('INSERT INTO users (name,email,phone,password,balance) VALUES (?,?,?,?,?)', ['Admin','admin@ex.com','',hash,0]);
    console.log('Database initialized');
  }
});

// Helpers
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
function generateToken(user){ return jwt.sign({id:user.id,email:user.email}, JWT_SECRET, {expiresIn:'7d'}); }
function authMiddleware(req,res,next){
  // intend supporting Bearer token or session
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.split(' ')[1];
    try {
      const data = jwt.verify(token, JWT_SECRET);
      req.user = data;
      return next();
    } catch(e){
      return res.status(401).json({error:'Token inválido'});
    }
  }
  // session fallback
  if (req.session && req.session.user) {
    req.user = req.session.user;
    return next();
  }
  return res.status(401).json({error:'No autorizado'});
}

// multer (uploads)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
  destination: (req,file,cb)=> cb(null, uploadDir),
  filename: (req,file,cb)=> cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g,'_'))
});
const upload = multer({ storage });

// Rutas: registro / login
app.post('/api/register', (req,res)=>{
  const {name,email,phone,password} = req.body;
  if(!email || !password) return res.status(400).json({error:'Datos requeridos'});
  const salt = bcrypt.genSaltSync(8);
  const hash = bcrypt.hashSync(password, salt);
  db.run('INSERT INTO users (name,email,phone,password,balance) VALUES (?,?,?,?,?)', [name||'', email, phone||'', hash, 0], function(err){
    if(err) return res.status(400).json({error:err.message});
    return res.json({ok:true, id:this.lastID});
  });
});

app.post('/api/login', (req,res)=>{
  const {email,password} = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], (err,row)=>{
    if(err) return res.status(500).json({error:err.message});
    if(!row) return res.status(400).json({error:'Usuario no encontrado'});
    if(!bcrypt.compareSync(password,row.password)) return res.status(400).json({error:'Contraseña incorrecta'});
    // sesión y token
    req.session.user = { id: row.id, email: row.email, name: row.name };
    const token = generateToken(row);
    return res.json({token, user:{id:row.id,name:row.name,email:row.email,phone:row.phone,balance:row.balance}});
  });
});

app.post('/api/logout', (req,res)=>{
  req.session.destroy(()=> res.json({ok:true}));
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

// crear inversión (usuario autenticado)
app.post('/api/invest', authMiddleware, (req,res)=>{
  const {plan,amount} = req.body;
  if(!plan||!amount) return res.status(400).json({error:'Datos requeridos'});
  const createdAt = new Date().toISOString();
  db.run('INSERT INTO investments (user_id,plan,amount,status,createdAt) VALUES (?,?,?,?,?)', [req.user.id, plan, amount, 'pending', createdAt], function(err){
    if(err) return res.status(500).json({error:err.message});
    return res.json({ok:true, id:this.lastID, status:'pending'});
  });
});

// subir comprobante de pago (proof)
app.post('/api/payments/upload-proof', authMiddleware, upload.single('proof'), (req,res)=>{
  const userId = req.user.id;
  const amount = Number(req.body.amount) || 0;
  if(!req.file) return res.status(400).json({error:'No file uploaded'});
  const id = 'NEQ-' + Date.now();
  const createdAt = new Date().toISOString();
  const filePath = '/uploads/' + path.basename(req.file.path);
  db.run('INSERT INTO payments (id,user_id,provider,amount,status,file,note,createdAt) VALUES (?,?,?,?,?,?,?,?)', [id,userId,'nequi',amount,'pending',filePath,'',createdAt], function(err){
    if(err) return res.status(500).json({error:err.message});
    return res.json({ok:true, id, file: filePath, status:'pending'});
  });
});

// solicitud de retiro
app.post('/api/withdraw', authMiddleware, (req,res)=>{
  const {amount,account} = req.body;
  if(!amount||!account) return res.status(400).json({error:'Datos requeridos'});
  const createdAt = new Date().toISOString();
  db.run('INSERT INTO withdrawals (user_id,amount,account,status,createdAt) VALUES (?,?,?,?,?)', [req.user.id,amount,account,'pending',createdAt], function(err){
    if(err) return res.status(500).json({error:err.message});
    return res.json({ok:true, id:this.lastID, status:'pending'});
  });
});

// Rutas admin protegidas por ADMIN_TOKEN
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
  return res.json({number: process.env.NEQUI_NUMBER || '+573014808791', qr_url: process.env.NEQUI_QR_URL || null});
});

// servir uploads estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// fallback a frontend con manejo de errores
app.get('*', (req,res)=>{
  const indexPath = path.join(__dirname, 'public', 'index.html');
  res.sendFile(indexPath, (err)=>{
    if(err){
      console.error('Error al servir index.html:', err);
      res.status(500).send('Error cargando la página principal');
    }
  });
});

// iniciar servidor
app.listen(PORT, ()=> {
  console.log('Server running on port', PORT);
});
