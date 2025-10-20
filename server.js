/* server.js - ENERGYSTICK (MongoDB)
   Guarda balances en USD y COP. */
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Si quieres, pega aquí tu MONGO_URI real o ponla en Render en la variable MONGO_URI
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://rtickto_db_user:P23ijc0W7eeCFmUI@cluster0.rqw7yje.mongodb.net/?retryWrites=true&w=majority";
const JWT_SECRET = process.env.JWT_SECRET || 'clave_dev_energystick';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin_token_energystick';
const TELEGRAM_LINK = process.env.TELEGRAM_LINK || 'https://t.me/Andrewsbuyer';
const NEQUI_NUMBER = process.env.NEQUI_NUMBER || '+573014808791';
const NEQUI_QR_URL = process.env.NEQUI_QR_URL || null;

if(MONGO_URI){
  mongoose.connect(MONGO_URI, {useNewUrlParser:true, useUnifiedTopology:true})
    .then(()=>console.log('MongoDB connected'))
    .catch(e=>console.error('Mongo error',e.message));
} else {
  console.warn('MONGO_URI no configurada. Registros y logins fallaran.');
}

// Esquemas
const userSchema = new mongoose.Schema({
  name:String,
  email:{type:String,unique:true},
  phone:String,
  password:String,
  balance_usd:{type:Number,default:0},
  balance_cop:{type:Number,default:0}
});
const investSchema = new mongoose.Schema({
  userId:mongoose.Schema.Types.ObjectId,
  plan:String,
  amount:Number,
  currency:String,
  status:{type:String,default:'pending'},
  createdAt:Date
});
const withdrawalSchema = new mongoose.Schema({
  userId:mongoose.Schema.Types.ObjectId,
  amount:Number,
  currency:String,
  account:String,
  status:{type:String,default:'pending'},
  createdAt:Date
});
const paymentSchema = new mongoose.Schema({
  _id:String,
  userId:mongoose.Schema.Types.ObjectId,
  provider:String,
  amount:Number,
  currency:String,
  status:String,
  file:String,
  note:String,
  createdAt:Date
});

const User = mongoose.model('User', userSchema);
const Investment = mongoose.model('Investment', investSchema);
const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);
const Payment = mongoose.model('Payment', paymentSchema);

// Crear admin si no existe
(async ()=>{
  try{
    const a = await User.findOne({email:'admin@energystick.com'});
    if(!a){
      const h = bcrypt.hashSync('admin1234',8);
      await User.create({name:'Admin',email:'admin@energystick.com',phone:'',password:h,balance_usd:0,balance_cop:0});
      console.log('Admin creado');
    }
  }catch(e){ console.error(e); }
})();

function generateToken(user){ return jwt.sign({id:user._id,email:user.email}, JWT_SECRET, {expiresIn:'7d'}); }
function auth(req,res,next){ const h = req.headers.authorization; if(!h) return res.status(401).json({error:'No autorizado'}); const token = h.split(' ')[1]; try{ const data = jwt.verify(token,JWT_SECRET); req.user = data; next(); }catch(e){ return res.status(401).json({error:'Token inválido'});} }

const uploadDir = path.join(__dirname,'uploads'); if(!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({ destination:(req,file,cb)=>cb(null,uploadDir), filename:(req,file,cb)=>cb(null,Date.now()+'-'+file.originalname.replace(/\\s+/g,'_')) });
const upload = multer({storage});

// Rutas
app.post('/api/register', async (req,res)=>{
  try{
    const {name,email,phone,password} = req.body;
    if(!email||!password) return res.status(400).json({error:'Datos requeridos'});
    const exists = await User.findOne({email});
    if(exists) return res.status(400).json({error:'Email ya registrado'});
    const hash = bcrypt.hashSync(password,8);
    const u = await User.create({name,email,phone,password:hash,balance_usd:0,balance_cop:0});
    return res.json({ok:true,id:u._id});
  }catch(e){ return res.status(500).json({error:e.message}); }
});

app.post('/api/login', async (req,res)=>{
  try{
    const {email,password} = req.body;
    const user = await User.findOne({email});
    if(!user) return res.status(400).json({error:'Usuario no encontrado'});
    if(!bcrypt.compareSync(password,user.password)) return res.status(400).json({error:'Contraseña incorrecta'});
    const token = generateToken(user);
    return res.json({token,user:{id:user._id,name:user.name,email:user.email,phone:user.phone,balance_usd:user.balance_usd,balance_cop:user.balance_cop}});
  }catch(e){ return res.status(500).json({error:e.message}); }
});

app.get('/api/me', auth, async (req,res)=>{
  try{
    const user = await User.findById(req.user.id).select('name email phone balance_usd balance_cop');
    if(!user) return res.status(404).json({error:'Usuario no encontrado'});
    const investments = await Investment.find({userId:user._id}).sort({createdAt:-1});
    const withdrawals = await Withdrawal.find({userId:user._id}).sort({createdAt:-1});
    return res.json({user,investments,withdrawals,telegram:TELEGRAM_LINK,nequi:{number:NEQUI_NUMBER,qr:NEQUI_QR_URL}});
  }catch(e){ return res.status(500).json({error:e.message}); }
});

app.post('/api/invest', auth, async (req,res)=>{
  try{
    const {plan,amount,currency} = req.body;
    if(!plan||!amount||!currency) return res.status(400).json({error:'Datos requeridos'});
    const inv = await Investment.create({userId:req.user.id,plan,amount,currency,status:'pending',createdAt:new Date()});
    return res.json({ok:true,id:inv._id});
  }catch(e){ return res.status(500).json({error:e.message}); }
});

app.post('/api/payments/upload-proof', auth, upload.single('proof'), async (req,res)=>{
  try{
    if(!req.file) return res.status(400).json({error:'No file uploaded'});
    const id = 'NEQ-'+Date.now();
    const p = await Payment.create({_id:id,userId:req.user.id,provider:'nequi',amount:Number(req.body.amount||0),currency:req.body.currency||'COP',status:'pending',file:'/uploads/'+req.file.filename,note:'',createdAt:new Date()});
    return res.json({ok:true,id:p._id,file:p.file});
  }catch(e){ return res.status(500).json({error:e.message}); }
});

app.post('/api/withdraw', auth, async (req,res)=>{
  try{
    const {amount,currency,account} = req.body;
    if(!amount||!account||!currency) return res.status(400).json({error:'Datos requeridos'});
    const w = await Withdrawal.create({userId:req.user.id,amount:Number(amount),currency,account,status:'pending',createdAt:new Date()});
    return res.json({ok:true,id:w._id});
  }catch(e){ return res.status(500).json({error:e.message}); }
});

// admin endpoints
app.get('/api/admin/pending', async (req,res)=>{
  const token = req.headers['x-admin-token'];
  if(token !== ADMIN_TOKEN) return res.status(401).json({error:'No autorizado'});
  const payments = await Payment.find({status:'pending'}).sort({createdAt:-1});
  const withdraws = await Withdrawal.find({status:'pending'}).sort({createdAt:-1});
  return res.json({payments,withdraws});
});

app.post('/api/admin/payments/:id/approve', async (req,res)=>{
  const token = req.headers['x-admin-token'];
  if(token !== ADMIN_TOKEN) return res.status(401).json({error:'No autorizado'});
  const id = req.params.id;
  const p = await Payment.findById(id);
  if(!p) return res.status(404).json({error:'Pago no encontrado'});
  if(p.status!=='pending') return res.status(400).json({error:'No está en pending'});
  p.status='approved'; await p.save();
  if(p.currency==='USD') await User.findByIdAndUpdate(p.userId,{$inc:{balance_usd:p.amount}});
  else await User.findByIdAndUpdate(p.userId,{$inc:{balance_cop:p.amount}});
  return res.json({ok:true});
});

app.post('/api/admin/withdrawals/:id/approve', async (req,res)=>{
  const token = req.headers['x-admin-token'];
  if(token !== ADMIN_TOKEN) return res.status(401).json({error:'No autorizado'});
  const id = req.params.id;
  const w = await Withdrawal.findById(id);
  if(!w) return res.status(404).json({error:'No encontrado'});
  w.status='approved'; await w.save();
  return res.json({ok:true});
});

app.get('/api/nequi', (req,res)=> res.json({number:NEQUI_NUMBER,qr:NEQUI_QR_URL}));

app.use('/uploads', express.static(path.join(__dirname,'uploads')));

app.get('*',(req,res)=> res.sendFile(path.join(__dirname,'public','index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log('Server running on port', PORT));
