// server/server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// --- Database (SQLite file)
const dbFile = path.join(__dirname, 'data.db');
const dbExists = fs.existsSync(dbFile);
const db = new sqlite3.Database(dbFile);

db.serialize(() => {
  if(!dbExists){
    db.run(`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, password TEXT, balance REAL DEFAULT 0)`);
    db.run(`CREATE TABLE investments (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, plan TEXT, amount REAL, status TEXT, createdAt TEXT)`);
    db.run(`CREATE TABLE withdrawals (id TEXT PRIMARY KEY, user_id INTEGER, account TEXT, amount REAL, status TEXT, createdAt TEXT)`);
    db.run(`CREATE TABLE payments (id TEXT PRIMARY KEY, user_id INTEGER, provider TEXT, amount REAL, status TEXT, createdAt TEXT)`);
    // insert admin user example (password: 123456)
    const salt = bcrypt.genSaltSync(8);
    const hash = bcrypt.hashSync('123456', salt);
    db.run('INSERT INTO users (name,email,password,balance) VALUES (?,?,?,?)', ['Admin','admin@ex.com',hash,0]);
    console.log('Base de datos creada con tablas iniciales.');
  }
});

// --- Helpers
function generateToken(user){ return jwt.sign({id:user.id,email:user.email}, process.env.JWT_SECRET || 'devsecret',{expiresIn:'7d'}); }
function authMiddleware(req,res,next){
  const h = req.headers.authorization;
  if(!h) return res.status(401).json({error:'No autorizado'});
  const token = h.split(' ')[1];
  try{
    const data = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    req.user = data;
    next();
  }catch(e){ return res.status(401).json({error:'Token inválido'}); }
}

// --- Public endpoints
app.post('/api/register', async (req,res)=>{
  const {name,email,password} = req.body;
  if(!email || !password) return res.status(400).json({error:'Datos requeridos'});
  const salt = bcrypt.genSaltSync(8);
  const hash = bcrypt.hashSync(password, salt);
  db.run('INSERT INTO users (name,email,password,balance) VALUES (?,?,?,?)',[name,email,hash,0], function(err){
    if(err) return res.status(400).json({error: err.message});
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
  db.get('SELECT id,name,email,balance FROM users WHERE id = ?', [req.user.id], (err,row)=>{
    if(err) return res.status(500).json({error:err.message});
    if(!row) return res.status(404).json({error:'Usuario no encontrado'});
    // get history
    db.all('SELECT id,provider,amount,status,createdAt FROM payments WHERE user_id = ? ORDER BY createdAt DESC LIMIT 20',[row.id], (err,payments)=>{
      if(err) payments = [];
      // Get nequi config from env
      const nequi = { number: process.env.NEQUI_NUMBER || null, qr_url: process.env.NEQUI_QR_URL || null };
      return res.json({user:row, history: payments, nequi});
    });
  });
});

// --- Invest endpoint (creates PayU order and returns redirect)
app.post('/api/invest', authMiddleware, (req,res)=>{
  const {plan,amount} = req.body;
  if(!amount || amount <= 0) return res.status(400).json({error:'Monto inválido'});
  // create investment record with status pending
  const createdAt = new Date().toISOString();
  db.run('INSERT INTO investments (user_id,plan,amount,status,createdAt) VALUES (?,?,?,?,?)',[req.user.id, plan, amount, 'pending', createdAt], function(err){
    if(err) return res.status(500).json({error:err.message});
    const investId = this.lastID;
    // Create PayU order (placeholder) - in production use PayU SDK and sign requests
    if(process.env.PAYU_MERCHANT_ID && process.env.PAYU_API_KEY){
      // Build PayU form params (simplified). For production follow PayU docs.
      const redirectUrl = createPayURedirect(req.user.id, investId, amount);
      return res.json({ok:true, redirectUrl});
    } else {
      // If PayU not configured, just mark investment as 'approved' for demo and credit balance
      db.run('UPDATE investments SET status = ? WHERE id = ?', ['approved', investId], ()=>{
        db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, req.user.id], ()=>{
          // insert payment record
          const pid = 'PAY-' + Date.now();
          db.run('INSERT INTO payments (id,user_id,provider,amount,status,createdAt) VALUES (?,?,?,?,?)',[pid,req.user.id,'demo',amount,'approved',createdAt]);
          return res.json({ok:true, message:'Modo demo: inversión aprobada y saldo acreditado.'});
        });
      });
    }
  });
});

function createPayURedirect(userId, investId, amount){
  // This is a placeholder that would create a signed request to PayU and return the form POST URL or hosted checkout.
  // For now we generate a fake URL to show how it will redirect.
  const base = process.env.PAYU_TEST_REDIRECT || 'https://sandbox.payu.com/payment';
  const redirect = base + '?merchantId=' + encodeURIComponent(process.env.PAYU_MERCHANT_ID || '') + '&referenceCode=INV_' + investId + '&amount=' + amount;
  return redirect;
}

// PayU webhook endpoint (placeholder)
app.post('/api/webhook/payu', (req,res)=>{
  console.log('Webhook PayU:', req.body);
  // In production: validate signature, find investment by reference, update status, credit user's balance, create payment record.
  res.json({ok:true});
});

// --- Withdraw
app.post('/api/withdraw', authMiddleware, (req,res)=>{
  const {account,amount} = req.body;
  if(!amount || amount <= 0) return res.status(400).json({error:'Monto inválido'});
  const id = 'WD-' + Date.now();
  const createdAt = new Date().toISOString();
  // get user balance
  db.get('SELECT balance FROM users WHERE id = ?', [req.user.id], (err,row)=>{
    if(err) return res.status(500).json({error:err.message});
    if(!row) return res.status(404).json({error:'Usuario no encontrado'});
    if(row.balance < amount) return res.status(400).json({error:'Saldo insuficiente'});
    // deduct balance and create withdrawal record (status pending)
    db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, req.user.id], function(err){
      if(err) return res.status(500).json({error:err.message});
      db.run('INSERT INTO withdrawals (id,user_id,account,amount,status,createdAt) VALUES (?,?,?,?,?)',[id,req.user.id,account,amount,'pending',createdAt], function(err){
        if(err) return res.status(500).json({error:err.message});
        // In production: call payout API (PayU/Kushki) here to execute transfer to bank/Nequi.
        return res.json({ok:true, id});
      });
    });
  });
});

// Admin endpoint to view data (very simple auth via env ADMIN_TOKEN)
app.get('/api/admin/data', (req,res)=>{
  const token = req.headers['x-admin-token'];
  if(token !== process.env.ADMIN_TOKEN) return res.status(401).json({error:'No autorizado'});
  db.serialize(()=>{
    db.all('SELECT * FROM users', [], (err, users)=>{
      db.all('SELECT * FROM investments', [], (err2, investments)=>{
        db.all('SELECT * FROM withdrawals', [], (err3, withdrawals)=>{
          db.all('SELECT * FROM payments', [], (err4, payments)=>{
            res.json({users, investments, withdrawals, payments});
          });
        });
      });
    });
  });
});

// Endpoint to get Nequi config (public)
app.get('/api/nequi', (req,res)=>{
  return res.json({number: process.env.NEQUI_NUMBER || null, qr_url: process.env.NEQUI_QR_URL || null});
});

// Serve frontend index for any other route (SPA)
app.get('*', (req,res)=>{
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log('Server running on', PORT));
