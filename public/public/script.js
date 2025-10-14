const api = {
  register: '/api/register',
  login: '/api/login',
  me: '/api/me',
  invest: '/api/invest',
  withdraw: '/api/withdraw',
  uploadProof: '/api/payments/upload-proof',
  nequi: '/api/nequi'
};

let token = localStorage.getItem('token') || null;
let user = null;

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const investmentForm = document.getElementById('investment-form');
  const withdrawForm = document.getElementById('withdraw-form');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = e.target.email.value.trim();
      const password = e.target.password.value.trim();
      const res = await fetch(api.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        location.reload();
      } else alert(data.error || 'Error al iniciar sesión');
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = e.target.name.value.trim();
      const email = e.target.email.value.trim();
      const phone = e.target.phone.value.trim();
      const password = e.target.password.value.trim();
      const res = await fetch(api.register, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password })
      });
      const data = await res.json();
      if (data.ok) {
        alert('Registro exitoso. Ahora inicia sesión.');
        location.reload();
      } else alert(data.error || 'Error en el registro');
    });
  }

  if (token) loadUserData();

  if (investmentForm) {
    investmentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const plan = e.target.plan.value;
      const amount = parseFloat(e.target.amount.value);
      const res = await fetch(api.invest, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ plan, amount })
      });
      const data = await res.json();
      if (data.ok) {
        alert('Inversión registrada, pendiente de aprobación.');
        loadUserData();
      } else alert(data.error || 'Error al invertir');
    });
  }

  if (withdrawForm) {
    withdrawForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = parseFloat(e.target.amount.value);
      const account = e.target.account.value.trim();
      const res = await fetch(api.withdraw, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount, account })
      });
      const data = await res.json();
      if (data.ok) {
        alert('Solicitud de retiro enviada.');
        loadUserData();
      } else alert(data.error || 'Error en el retiro');
    });
  }

  document.getElementById('logout')?.addEventListener('click', () => {
    localStorage.removeItem('token');
    location.reload();
  });
});

async function loadUserData() {
  const res = await fetch(api.me, { headers: { 'Authorization': `Bearer ${token}` } });
  const data = await res.json();
  if (data.user) {
    user = data.user;
    document.getElementById('user-name').innerText = user.name;
    document.getElementById('user-balance').innerText = `$${user.balance.toLocaleString()}`;
  }
}
