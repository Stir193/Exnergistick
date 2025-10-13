const API_BASE_URL = 'https://exnergistick.onrender.com';

async function registerUser(event) {
    event.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password })
        });

        if (!response.ok) throw new Error('Error en el registro');
        alert('✅ Registro exitoso. ¡Bienvenido a Exnergistick!');
        document.getElementById('registerForm').reset();
    } catch (error) {
        alert('❌ Error al conectar con el servidor. Intenta más tarde.');
        console.error(error);
    }
}

async function loginUser(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) throw new Error('Credenciales inválidas');
        alert('✅ Inicio de sesión correcto.');
    } catch (error) {
        alert('❌ Error al conectar con el servidor.');
        console.error(error);
    }
}function startInvestment(event) {
    event.preventDefault();
    const amount = document.getElementById('amount').value;
    if (!amount) return alert('Selecciona un monto.');

    document.getElementById('nequiSection').style.display = 'block';
    alert(`✅ Has seleccionado invertir $${amount}. Realiza tu pago por Nequi al 3014808791 y sube el comprobante.`);
}
