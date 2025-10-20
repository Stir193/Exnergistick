async function registrar() {
  const nombre = document.getElementById("nombre").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, email, password }),
  });
  const data = await res.json();
  document.getElementById("resultado").innerText = data.success
    ? "✅ Usuario registrado con éxito"
    : "❌ Error al registrar usuario";
}

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  document.getElementById("resultado").innerText = data.success
    ? `✅ Bienvenido ${data.user.nombre}`
    : "❌ Credenciales incorrectas";
}
