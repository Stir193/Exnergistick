// --- Funciones principales de la app ---
const api = "https://exnergistick-1.onrender.com/api";

// Mostrar formularios
function showLogin() {
  document.getElementById("loginForm").style.display = "block";
  document.getElementById("registerForm").style.display = "none";
}

function showRegister() {
  document.getElementById("registerForm").style.display = "block";
  document.getElementById("loginForm").style.display = "none";
}

// Registro de usuario
async function registerUser(event) {
  event.preventDefault();
  const name = document.getElementById("regName").value;
  const email = document.getElementById("regEmail").value;
  const phone = document.getElementById("regPhone").value;
  const password = document.getElementById("regPassword").value;

  const res = await fetch(`${api}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, phone, password })
  });
  const data = await res.json();
  if (data.ok) {
    alert("Registro exitoso. Ahora puedes iniciar sesión.");
    showLogin();
  } else {
    alert("Error: " + data.error);
  }
}

// Inicio de sesión
async function loginUser(event) {
  event.preventDefault();
  const email = document.getElementById("logEmail").value;
  const password = document.getElementById("logPassword").value;

  const res = await fetch(`${api}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();

  if (data.token) {
    localStorage.setItem("token", data.token);
    window.location.href = "panel.html";
  } else {
    alert("Credenciales incorrectas");
  }
}
