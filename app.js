/* Estilos generales */
body {
  margin: 0;
  font-family: 'Poppins', sans-serif;
  background-color: #f8f9fa;
  color: #333;
}

/* Encabezado */
header {
  background-color: #ffffff;
  border-bottom: 2px solid #eee;
  padding: 20px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

header h1 {
  color: #007bff;
  font-size: 1.8rem;
  margin: 0;
}

header nav a {
  color: #007bff;
  text-decoration: none;
  margin-left: 20px;
  font-weight: 500;
  transition: color 0.2s ease-in;
}

header nav a:hover {
  color: #0056b3;
}

/* Sección principal */
.hero {
  text-align: center;
  padding: 60px 20px;
  background-color: #e9f2ff;
}

.hero h2 {
  font-size: 2rem;
  margin-bottom: 10px;
}

.hero p {
  color: #555;
  font-size: 1.1rem;
}

/* Formulario */
form {
  max-width: 400px;
  margin: 40px auto;
  padding: 25px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}

form h3 {
  text-align: center;
  color: #007bff;
  margin-bottom: 20px;
}

input, select, button {
  width: 100%;
  padding: 10px;
  margin-top: 10px;
  border-radius: 5px;
  border: 1px solid #ccc;
}

button {
  background-color: #007bff;
  color: white;
  font-weight: bold;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover {
  background-color: #0056b3;
}

/* Cards de inversión */
.plans {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin: 40px;
}

.plan {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 3px 10px rgba(0,0,0,0.1);
  padding: 20px;
  text-align: center;
  transition: transform 0.2s ease-in-out;
}

.plan:hover {
  transform: scale(1.03);
}

.plan h4 {
  color: #007bff;
  margin-bottom: 10px;
}

.plan p {
  color: #555;
}

.plan button {
  margin-top: 10px;
}

/* Footer */
footer {
  background-color: #f1f1f1;
  text-align: center;
  padding: 15px 10px;
  color: #555;
  font-size: 0.9rem;
  margin-top: 50px;
}
