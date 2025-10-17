// script.js

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const showLogin = document.getElementById("showLogin");
  const showRegister = document.getElementById("showRegister");
  const message = document.getElementById("message");

  if (showRegister) {
    showRegister.addEventListener("click", () => {
      loginForm.style.display = "none";
      registerForm.style.display = "block";
      message.textContent = "";
    });
  }

  if (showLogin) {
    showLogin.addEventListener("click", () => {
      registerForm.style.display = "none";
      loginForm.style.display = "block";
      message.textContent = "";
    });
  }

  // Manejo del formulario de registro
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
      };

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      message.textContent = result.message || "Error al registrar";
      if (res.ok) {
        registerForm.reset();
      }
    });
  }

  // Manejo del formulario de inicio de sesión
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = {
        email: document.getElementById("loginEmail").value,
        password: document.getElementById("loginPassword").value,
      };

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      message.textContent = result.message || "Error al iniciar sesión";

      if (res.ok) {
        localStorage.setItem("user", JSON.stringify(result.user));
        window.location.href = "/dashboard.html";
      }
    });
  }
});
