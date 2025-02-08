async function registerUser() {
    const name = document.getElementById('register_name').value;
    const email = document.getElementById('register_email').value;
    const password = document.getElementById('register_password').value;
    
    const response = await fetch('http://127.0.0.1:8000/users/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
    });

    const data = await response.json();

    if (response.ok) {
        alert('Sikeres regisztráció! Add meg a verifikációs kódot.');

        // Verifikációs szekció megjelenítése
        document.getElementById('verification_section').style.display = 'block';

        // Automatikusan beállítjuk az email-t és entity_id-t a verifikációhoz
        localStorage.setItem('verification_email', email);
        localStorage.setItem('verification_entity_id', data.id);
        localStorage.setItem('randuin', password);
    } else {
        alert(data.detail || 'Hiba történt a regisztráció során!');
    }
}

async function verifyCode() {
    const verificationCode = document.getElementById('verification_code').value;
    const email = localStorage.getItem('verification_email');
    const entityId = localStorage.getItem('verification_entity_id');
    const password = localStorage.getItem('randuin');
    if (!email || !entityId) {
        alert('Hiba: nincs érvényes regisztrációs adat!');
        return;
    }

    const response = await fetch('http://127.0.0.1:8000/confirm?' + new URLSearchParams({
        entity_type: 'user',
        entity_id: entityId,
        verification_process: 'EMAIL',
        code: verificationCode
    }), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (response.ok) {
        alert('Sikeres verifikáció! Átirányítás a catalog oldalra.');

        const response = await fetch('http://127.0.0.1:8000/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: email, password })
    });

    const data = await response.json();
    if (data.access_token) {
        localStorage.setItem('token', data.access_token);
       // alert('Sikeres bejelentkezés!');
        window.location.href = "/catalog/catalog.html";
    } else {
        alert('Hibás átirányítás!');
    }

    } else {
        alert('Hibás verifikációs kód!');
    }
}

async function loginUser() {
    const email = document.getElementById('login_email').value;
    const password = document.getElementById('login_password').value;
    
    const response = await fetch('http://127.0.0.1:8000/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: email, password })
    });

    const data = await response.json();
    if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        alert('Sikeres bejelentkezés OG!');
        window.location.href = "/catalog/catalog.html";
    } else {
        alert('Hibás bejelentkezési adatok!');
    }
}

async function getUserData() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Először jelentkezz be!');
        return;
    }
    
    const response = await fetch('http://127.0.0.1:8000/me', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await response.json();
    document.getElementById('user_data').innerText = JSON.stringify(data, null, 2);
}