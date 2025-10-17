// public/app.js
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const showLogin = document.getElementById('showLogin');
  const showRegister = document.getElementById('showRegister');
  const message = document.getElementById('message');
  const appContent = document.getElementById('appContent');
  const userName = document.getElementById('userName');
  const userBalance = document.getElementById('userBalance');
  const logoutBtn = document.getElementById('logoutBtn');

  function showTab(tab) {
    if (tab === 'login') {
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
      showLogin.classList.add('active');
      showRegister.classList.remove('active');
    } else {
      loginForm.classList.add('hidden');
      registerForm.classList.remove('hidden');
      showLogin.classList.remove('active');
      showRegister.classList.add('active');
    }
    message.textContent = '';
  }

  showLogin.addEventListener('click', ()=> showTab('login'));
  showRegister.addEventListener('click', ()=> showTab('register'));

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    message.textContent = 'Registrando...';
    try {
      const res = await fetch('/api/register', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({name,email,phone,password})
      });
      const data = await res.json();
      if(data.ok) {
        message.textContent = 'Registrado. Por favor inicia sesión.';
        showTab('login');
      } else {
        message.textContent = data.error || 'Error al registrar';
      }
    } catch(err) {
      message.textContent = 'Error de conexión';
    }
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    message.textContent = 'Iniciando sesión...';
    try {
      const res = await fetch('/api/login', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({email,password})
      });
      const data = await res.json();
      if(data.token) {
        localStorage.setItem('token', data.token);
        message.textContent = 'Sesión iniciada';
        loadProfile();
      } else {
        message.textContent = data.error || 'Error al iniciar sesión';
      }
    } catch(err) { message.textContent = 'Error de conexión'; }
  });

  async function loadProfile(){
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/me', { headers:{ Authorization: token ? 'Bearer '+token : '' }});
      const data = await res.json();
      if(data.user){
        userName.textContent = data.user.name || data.user.email;
        userBalance.textContent = data.user.balance ? data.user.balance : '0';
        appContent.classList.remove('hidden');
        document.querySelector('.auth').classList.add('hidden');
      } else {
        message.textContent = data.error || 'No autenticado';
      }
    } catch(e){ message.textContent = 'Error de conexión'; }
  }

  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/logout', { method:'POST' });
    } catch(e){}
    localStorage.removeItem('token');
    appContent.classList.add('hidden');
    document.querySelector('.auth').classList.remove('hidden');
  });

  // on load check session
  loadProfile();
});
