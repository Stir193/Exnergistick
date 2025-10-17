// === CAMBIO ENTRE LOGIN Y REGISTRO ===
const loginTab = document.getElementById("login-tab");
const registerTab = document.getElementById("register-tab");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const message = document.getElementById("message");

loginTab.addEventListener("click", () => {
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
  message.textContent = "";
});

registerTab.addEventListener("click", () => {
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
  message.textContent = "";
});

// === FUNCIÓN PARA LOGIN ===
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (data.token) {
      localStorage.setItem("token", data.token);
      message.style.color = "green";
      message.textContent = "Inicio de sesión exitoso ✅";
      setTimeout(() => (window.location.href = "/dashboard.html"), 1000);
    } else {
      message.style.color = "red";
      message.textContent = data.error || "Error al iniciar sesión";
    }
  } catch (err) {
    message.style.color = "red";
    message.textContent = "Error de conexión con el servidor";
  }
});

// === FUNCIÓN PARA REGISTRO ===
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("register-name").value;
  const email = document.getElementById("register-email").value;
  const phone = document.getElementById("register-phone").value;
  const password = document.getElementById("register-password").value;

  try {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, password }),
    });

    const data = await res.json();
    if (data.ok) {
      message.style.color = "green";
      message.textContent = "Usuario registrado con éxito ✅";
      registerForm.reset();
    } else {
      message.style.color = "red";
      message.textContent = data.error || "Error en el registro";
    }
  } catch (err) {
    message.style.color = "red";
    message.textContent = "Error de conexión con el servidor";
  }
});
