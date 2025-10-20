// interactions: registro + login
document.addEventListener('DOMContentLoaded', ()=>{
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const loginSection = document.getElementById('login-section');
  const registerSection = document.getElementById('register-section');
  const msg = document.getElementById('message');

  tabLogin.addEventListener('click', ()=>{ loginSection.classList.remove('hidden'); registerSection.classList.add('hidden'); msg.textContent=''; });
  tabRegister.addEventListener('click', ()=>{ registerSection.classList.remove('hidden'); loginSection.classList.add('hidden'); msg.textContent=''; });

  // register
  document.getElementById('register-form').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const phone = document.getElementById('register-phone').value;
    const password = document.getElementById('register-password').value;
    try{
      const res = await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,phone,password})});
      const data = await res.json();
      if(data.ok){ msg.style.color='#6ee7b7'; msg.textContent='Cuenta creada. Inicia sesión.'; document.getElementById('register-form').reset(); loginSection.classList.remove('hidden'); registerSection.classList.add('hidden'); }
      else { msg.style.color='#ff7a7a'; msg.textContent=data.error||'Error al registrar'; }
    }catch(e){ msg.style.color='#ff7a7a'; msg.textContent='Error de conexión'; }
  });

  // login
  document.getElementById('login-form').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try{
      const res = await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
      const data = await res.json();
      if(data.token){ localStorage.setItem('token',data.token); localStorage.setItem('user',JSON.stringify(data.user)); msg.style.color='#6ee7b7'; msg.textContent='Inicio correcto'; setTimeout(()=>{ window.location.href='/dashboard.html'; },800); }
      else { msg.style.color='#ff7a7a'; msg.textContent=data.error||'Error al iniciar sesión'; }
    }catch(e){ msg.style.color='#ff7a7a'; msg.textContent='Error de conexión'; }
  });
});
