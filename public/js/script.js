/* ===== Estilos generales ===== */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: "Segoe UI", Arial, sans-serif;
}

body {
  background: linear-gradient(180deg, #ffffff, #e8f0fe);
  color: #222;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ===== Encabezado ===== */
header {
  text-align: center;
  padding: 2rem 1rem 1rem;
}

header h1 {
  font-size: 2rem;
  color: #1e40af;
  font-weight: 700;
}

header .highlight {
  color: #2563eb;
}

header p {
  margin-top: 0.5rem;
  color: #444;
}

/* ===== Formularios ===== */
main {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}

#forms-container {
  background: #fff;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  width: 90%;
  max-width: 400px;
}

form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

form h2 {
  text-align: center;
  color: #1e3a8a;
}

input {
  padding: 0.8rem;
  border: 1px solid #ccc;
  border-radius: 5px;
}

button {
  background: #2563eb;
  color: white;
  border: none;
  padding: 0.8rem;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  transition: 0.3s;
}

button:hover {
  background: #1d4ed8;
}

a {
  color: #2563eb;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

#message {
  text-align: center;
  margin-top: 1rem;
  color: #333;
  font-weight: 500;
}

/* ===== Pie de página ===== */
footer {
  margin-top: auto;
  text-align: center;
  padding: 1rem;
  font-size: 0.9rem;
  color: #666;
}
