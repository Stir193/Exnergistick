// Frontend interactions for Exnergistick (lightweight)

document.addEventListener('click', function(e){
  if(e.target && e.target.classList.contains('invest-btn')){
    const amount = e.target.dataset.amount;
    startInvest(amount);
    e.target.scrollIntoView({behavior:'smooth', block:'center'});
  }
});

// Register form
document.getElementById('registerForm').addEventListener('submit', async function(e){
  e.preventDefault();
  const name = document.getElementById('reg_name').value.trim();
  const email = document.getElementById('reg_email').value.trim();
  const phone = document.getElementById('reg_phone').value.trim();
  const password = document.getElementById('reg_password').value.trim();
  const msgEl = document.getElementById('regMsg');
  msgEl.textContent = 'Procesando...';
  try{
    const res = await fetch('/api/register', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name,email,phone,password})});
    const data = await res.json();
    if(data.ok){ msgEl.textContent = 'Cuenta creada. Inicia sesión.'; document.getElementById('registerForm').reset(); }
    else msgEl.textContent = data.error || 'Error al crear cuenta.';
  }catch(err){ msgEl.textContent = 'Error de conexión'; }
});

// start invest: show invest section and prefill amount
function startInvest(amount){
  document.getElementById('inversion').style.display = 'block';
  document.getElementById('invInfo').textContent = 'Va a invertir: $' + Number(amount).toLocaleString('es-CO') + ' COP. Escanee el QR con Nequi y suba el comprobante.';
  // set nequi QR src if backend provides it
  fetch('/api/nequi').then(r=>r.json()).then(d=>{
    if(d.qr_url){ document.getElementById('nequiQR').src = d.qr_url; }
    else { /* leave blank if not provided */ }
    if(d.number) document.getElementById('nequiNumber').textContent = d.number;
  });
  // store amount for upload
  window.__pendingInvestment = Number(amount);
}

// upload proof
document.getElementById('submitProof').addEventListener('click', async function(){
  const file = document.getElementById('proofFile').files[0];
  const msg = document.getElementById('invMsg');
  if(!file){ msg.textContent = 'Selecciona una imagen del comprobante.'; return; }
  msg.textContent = 'Subiendo comprobante...';
  const token = localStorage.getItem('ex_token') || '';
  const form = new FormData();
  form.append('proof', file);
  form.append('amount', window.__pendingInvestment || 0);
  try{
    const res = await fetch('/api/payments/upload-proof', {method:'POST', headers: {'Authorization': 'Bearer '+token}, body: form});
    const data = await res.json();
    if(data.ok){ msg.textContent = 'Comprobante enviado. Espera aprobación del admin.'; document.getElementById('proofFile').value = ''; }
    else msg.textContent = data.error || 'Error al subir comprobante.';
  }catch(err){ msg.textContent = 'Error de conexión.'; }
});
