const API = '';// same origin

function show(el){ el.style.display='block'; }
function hide(el){ el.style.display='none'; }

// Registration
document.getElementById('registerForm').addEventListener('submit', async function(e){
  e.preventDefault();
  const name = document.getElementById('reg_name').value.trim();
  const email = document.getElementById('reg_email').value.trim();
  const phone = document.getElementById('reg_phone').value.trim();
  const password = document.getElementById('reg_password').value.trim();
  const msg = document.getElementById('regMsg');
  msg.textContent = 'Procesando...';
  try{
    const res = await fetch('/api/register', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name,email,phone,password})});
    const data = await res.json();
    if(data.ok){ msg.textContent = 'Cuenta creada. Inicia sesión.'; document.getElementById('registerForm').reset(); }
    else msg.textContent = data.error || 'Error';
  }catch(err){ msg.textContent = 'Error de conexión'; }
});

// Login
document.getElementById('loginForm').addEventListener('submit', async function(e){
  e.preventDefault();
  const email = document.getElementById('login_email').value.trim();
  const password = document.getElementById('login_password').value.trim();
  const msg = document.getElementById('loginMsg');
  msg.textContent = 'Conectando...';
  try{
    const res = await fetch('/api/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email,password})});
    const data = await res.json();
    if(data.token){ localStorage.setItem('ex_token', data.token); msg.textContent = 'Inicio de sesión correcto'; loadProfile(); }
    else msg.textContent = data.error || 'Credenciales inválidas';
  }catch(err){ msg.textContent = 'Error de conexión'; }
});

async function loadProfile(){
  const token = localStorage.getItem('ex_token');
  if(!token) return;
  try{
    const res = await fetch('/api/me', {headers:{'Authorization':'Bearer '+token}});
    const data = await res.json();
    if(data.user){
      document.getElementById('dashboard').style.display='block';
      document.getElementById('userName').textContent = data.user.name;
      document.getElementById('userBalance').textContent = Number(data.user.balance).toLocaleString('es-CO');
      const inv = document.getElementById('myInvestments'); inv.innerHTML='';
      (data.investments||[]).forEach(i=>{ inv.innerHTML += `<div><strong>${i.plan}</strong> - $${Number(i.amount).toLocaleString('es-CO')} - ${i.status}</div>`; });
      document.getElementById('registro').style.display='none';
    }
  }catch(err){ console.error(err); }
}

// Invest buttons
document.querySelectorAll('.invest-btn').forEach(btn => {
  btn.addEventListener('click', async function(){
    const amount = Number(this.dataset.amount);
    const token = localStorage.getItem('ex_token');
    if(!token){ alert('Debes iniciar sesión para invertir'); window.location.hash='#registro'; return; }
    const plan = this.parentElement.querySelector('h4').innerText;
    try{
      const res = await fetch('/api/invest', {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+token}, body: JSON.stringify({plan,amount})});
      const data = await res.json();
      if(data.ok){ alert('Inversión creada y pendiente. Escanea el QR para pagar a Nequi: 3014808791'); loadProfile(); }
      else alert(data.error||'Error al crear inversión');
    }catch(err){ alert('Error de conexión'); }
  });
});

// withdraw
document.getElementById('withdrawForm').addEventListener('submit', async function(e){
  e.preventDefault();
  const amount = Number(document.getElementById('withdraw_amount').value);
  const account = document.getElementById('withdraw_account').value.trim();
  const token = localStorage.getItem('ex_token');
  if(!token){ alert('Inicia sesión'); return; }
  try{
    const res = await fetch('/api/withdraw', {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+token}, body: JSON.stringify({amount,account})});
    const data = await res.json();
    if(data.ok){ document.getElementById('withdrawMsg').textContent = 'Solicitud enviada. Un asesor la revisará.'; loadProfile(); }
    else document.getElementById('withdrawMsg').textContent = data.error||'Error'; 
  }catch(err){ document.getElementById('withdrawMsg').textContent = 'Error de conexión'; }
});

document.getElementById('logoutBtn').addEventListener('click', function(){ localStorage.removeItem('ex_token'); location.reload(); });

if(localStorage.getItem('ex_token')) loadProfile();
