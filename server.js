// server.js - ENERGYSTICK (PostgreSQL)
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATABASE_URL = process.env.DATABASE_URL || '';
const JWT_SECRET = process.env.JWT_SECRET || 'clave_dev_energystick';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin_token_energystick';
const TELEGRAM_LINK = process.env.TELEGRAM_LINK || 'https://t.me/Andrewsbuyer';
const NEQUI_NUMBER = process.env.NEQUI_NUMBER || '+573014808791';
const NEQUI_QR_URL = process.env.NEQUI_QR_URL || null;

if(!DATABASE_URL) console.warn('⚠️ DATABASE_URL no configurada. Configura en Render > Environment.');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

// Inicializar tablas si no existen
async function initDB(){
  await pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    password TEXT,
    balance_usd NUMERIC DEFAULT 0,
    balance_cop NUMERIC DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS investments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    plan TEXT,
    amount NUMERIC,
    currency TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS withdrawals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    amount NUMERIC,
    currency TEXT,
    account TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    provider TEXT,
    amount NUMERIC,
    currency TEXT,
    status TEXT,
    file TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  `);
  // crear admin si no existe
  const r = await pool.query(`SELECT id FROM users WHERE email = $1`, ['admin@exnergistick.com']);
  if(r.rowCount === 0){
    const hash = bcrypt.hashSync('admin1234', 8);
    await pool.query(
      `INSERT INTO users (name,email,phone,password,balance_usd,balance_cop) VALUES ($1,$2,$3,$4,0,0)`,
      ['Admin','admin@exnergistick.com','',hash]
    );
    console.log('Admin creado');
  }
}
initDB().catch(e=>console.error('Init DB error', e.message));

function generateToken(user){ return jwt.sign({id:user.id,email:user.email}, JWT_SECRET, {expiresIn:'7d'}); }
async function auth(req,res,next){
  const h = req.headers.authorization; if(!h) return res.status(401).json({error:'No autorizado'});
  const token = h.split(' ')[1];
  try{ const data = jwt.verify(token, JWT_SECRET); req.user = data; next(); }
  catch(e){ return res.status(401).json({error:'Token inválido'}); }
}

// multer
const uploadDir = path.join(__dirname, 'uploads'); if(!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({ destination:(req,file,cb)=>cb(null,uploadDir), filename:(req,file,cb)=>cb(null,Date.now()+'-'+file.originalname.replace(/\s+/g,'_')) });
const upload = multer({storage});

// routes
app.post('/api/register', async (req,res)=>{
  try{
    const {name,email,phone,password} = req.body;
    if(!email||!password) return res.status(400).json({error:'Datos requeridos'});
    const exists = await pool.query('SELECT id FROM users WHERE email=$1',[email]);
    if(exists.rowCount>0) return res.status(400).json({error:'Email ya registrado'});
    const hash = bcrypt.hashSync(password,8);
    const insert = await pool.query(
      'INSERT INTO users (name,email,phone,password,balance_usd,balance_cop) VALUES ($1,$2,$3,$4,0,0) RETURNING id',
      [name,email,phone,hash]
    );
    return res.json({ok:true,id: insert.rows[0].id});
  }catch(e){ console.error(e); return res.status(500).json({error:e.message}); }
});

app.post('/api/login', async (req,res)=>{
  try{
    const {email,password} = req.body;
    const r = await pool.query('SELECT * FROM users WHERE email=$1',[email]);
    if(r.rowCount===0) return res.status(400).json({error:'Usuario no encontrado'});
    const user = r.rows[0];
    if(!bcrypt.compareSync(password,user.password)) return res.status(400).json({error:'Contraseña incorrecta'});
    const token = generateToken({id:user.id, email:user.email});
    return res.json({token, user:{id:user.id,name:user.name,email:user.email,phone:user.phone,balance_usd:user.balance_usd,balance_cop:user.balance_cop}});
  }catch(e){ console.error(e); return res.status(500).json({error:e.message}); }
});

app.get('/api/me', auth, async (req,res)=>{
  try{
    const r = await pool.query('SELECT id,name,email,phone,balance_usd,balance_cop FROM users WHERE id=$1',[req.user.id]);
    if(r.rowCount===0) return res.status(404).json({error:'Usuario no encontrado'});
    const user = r.rows[0];
    const investments = (await pool.query('SELECT id,plan,amount,currency,status,created_at FROM investments WHERE user_id=$1 ORDER BY created_at DESC',[user.id])).rows;
    const withdrawals = (await pool.query('SELECT id,amount,currency,status,created_at FROM withdrawals WHERE user_id=$1 ORDER BY created_at DESC',[user.id])).rows;
    return res.json({user,investments,withdrawals,telegram:TELEGRAM_LINK,nequi:{number:NEQUI_NUMBER,qr:NEQUI_QR_URL}});
  }catch(e){ console.error(e); return res.status(500).json({error:e.message}); }
});

app.post('/api/invest', auth, async (req,res)=>{
  try{
    const {plan,amount,currency} = req.body;
    if(!plan||!amount||!currency) return res.status(400).json({error:'Datos requeridos'});
    const inv = await pool.query('INSERT INTO investments (user_id,plan,amount,currency,status,created_at) VALUES ($1,$2,$3,$4,$5,now()) RETURNING id',[req.user.id,plan,amount,currency,'pending']);
    return res.json({ok:true,id:inv.rows[0].id});
  }catch(e){ console.error(e); return res.status(500).json({error:e.message}); }
});

app.post('/api/payments/upload-proof', auth, upload.single('proof'), async (req,res)=>{
  try{
    if(!req.file) return res.status(400).json({error:'No file uploaded'});
    const id = 'NEQ-'+Date.now();
    await pool.query('INSERT INTO payments (id,user_id,provider,amount,currency,status,file,note,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,now())',
      [id, req.user.id, 'nequi', Number(req.body.amount||0), req.body.currency||'COP', 'pending', '/uploads/'+req.file.filename, '']);
    return res.json({ok:true,id,file:'/uploads/'+req.file.filename});
  }catch(e){ console.error(e); return res.status(500).json({error:e.message}); }
});

app.post('/api/withdraw', auth, async (req,res)=>{
  try{
    const {amount,currency,account} = req.body;
    if(!amount||!account||!currency) return res.status(400).json({error:'Datos requeridos'});
    const w = await pool.query('INSERT INTO withdrawals (user_id,amount,currency,account,status,created_at) VALUES ($1,$2,$3,$4,$5,now()) RETURNING id',[req.user.id,amount,currency,account,'pending']);
    return res.json({ok:true,id:w.rows[0].id});
  }catch(e){ console.error(e); return res.status(500).json({error:e.message}); }
});

// admin endpoints
app.get('/api/admin/pending', async (req,res)=>{
  const token = req.headers['x-admin-token']; if(token !== ADMIN_TOKEN) return res.status(401).json({error:'No autorizado'});
  const payments = (await pool.query('SELECT * FROM payments WHERE status=$1 ORDER BY created_at DESC',['pending'])).rows;
  const withdraws = (await pool.query('SELECT * FROM withdrawals WHERE status=$1 ORDER BY created_at DESC',['pending'])).rows;
  return res.json({payments,withdraws});
});

app.post('/api/admin/payments/:id/approve', async (req,res)=>{
  const token = req.headers['x-admin-token']; if(token !== ADMIN_TOKEN) return res.status(401).json({error:'No autorizado'});
  const id = req.params.id;
  const p = (await pool.query('SELECT * FROM payments WHERE id=$1',[id])).rows[0];
  if(!p) return res.status(404).json({error:'Pago no encontrado'});
  if(p.status !== 'pending') return res.status(400).json({error:'No está en pending'});
  await pool.query('UPDATE payments SET status=$1 WHERE id=$2',['approved', id]);
  if(p.currency === 'USD') await pool.query('UPDATE users SET balance_usd = balance_usd + $1 WHERE id=$2',[p.amount, p.user_id]);
  else await pool.query('UPDATE users SET balance_cop = balance_cop + $1 WHERE id=$2',[p.amount, p.user_id]);
  return res.json({ok:true});
});

app.post('/api/admin/withdrawals/:id/approve', async (req,res)=>{
  const token = req.headers['x-admin-token']; if(token !== ADMIN_TOKEN) return res.status(401).json({error:'No autorizado'});
  const id = req.params.id;
  const w = (await pool.query('SELECT * FROM withdrawals WHERE id=$1',[id])).rows[0];
  if(!w) return res.status(404).json({error:'No encontrado'});
  await pool.query('UPDATE withdrawals SET status=$1 WHERE id=$2',['approved', id]);
  return res.json({ok:true});
});

app.get('/api/nequi', (req,res)=> res.json({number:NEQUI_NUMBER,qr:NEQUI_QR_URL}));

app.use('/uploads', express.static(path.join(__dirname,'uploads')));

app.get('*',(req,res)=> res.sendFile(path.join(__dirname,'public','index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log('Server running on port', PORT));
