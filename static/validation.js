const form = document.getElementById('form')
const firstname_input = document.getElementById('register_name')
const email_input = document.getElementById('login_email')
const password_input = document.getElementById('login_password')
const repeat_password_input = document.getElementById('repeat-password-input')
const error_message = document.getElementById('error-message')

form.addEventListener('submit', (e) => {
  e.preventDefault();
  let errors = []

  if(firstname_input){
    // If we have a firstname input then we are in the signup
    errors = getSignupFormErrors(firstname_input.value, email_input.value, password_input.value, repeat_password_input.value)


    if(errors.length > 0){
      // If there are any errors
      e.preventDefault()
      error_message.innerText  = errors.join(". ")
    }
    if(errors.length === 0){
      registerUser();

    }
  }
  else{
    // If we don't have a firstname input then we are in the login
    errors = getLoginFormErrors(email_input.value, password_input.value)
    if(errors.length > 0){
      // If there are any errors
      e.preventDefault()
      error_message.innerText  = errors.join(". ")
    }
    if(errors.length === 0){
      loginUser();
    }
  }



})

function getSignupFormErrors(firstname, email, password, repeatPassword){
  let errors = []

  if(firstname === '' || firstname == null){
    errors.push('Name is required')
    firstname_input.parentElement.classList.add('incorrect')
  }
  if(email === '' || email == null){
    errors.push('Email is required')
    email_input.parentElement.classList.add('incorrect')
  }
  if(password === '' || password == null){
    errors.push('Password is required')
    password_input.parentElement.classList.add('incorrect')
  }
  if(password.length < 8){
    errors.push('Password must have at least 8 characters')
    password_input.parentElement.classList.add('incorrect')
  }
  if(password !== repeatPassword){
    errors.push('Password does not match repeated password')
    password_input.parentElement.classList.add('incorrect')
    repeat_password_input.parentElement.classList.add('incorrect')
  }


  return errors;
}

function getLoginFormErrors(email, password){
  let errors = []

  if(email === '' || email == null){
    errors.push('Email is required')
    email_input.parentElement.classList.add('incorrect')
  }
  if(password === '' || password == null){
    errors.push('Password is required')
    password_input.parentElement.classList.add('incorrect')
  }

  return errors;
}

const allInputs = [firstname_input, email_input, password_input, repeat_password_input].filter(input => input != null)

allInputs.forEach(input => {
  input.addEventListener('input', () => {
    if(input.parentElement.classList.contains('incorrect')){
      input.parentElement.classList.remove('incorrect')
      error_message.innerText = ''
    }
  })
})


async function registerUser() {
  const name = document.getElementById('register_name').value;
  const email = document.getElementById('login_email').value;
  const password = document.getElementById('login_password').value;
  
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
    // Bejelentkezés sikeres, folytasd a normál folyamatot
    localStorage.setItem('access_token', data.access_token);
    window.location.href = "/catalog/catalog.html"; // Redirect a dashboard-ra
}else {
    if (data.status === 'not_verified') {
      // Ha az email nincs verifikálva, mutassuk a verifikációs kód mezőt
      alert(data.message); 
      document.getElementById('verification_section').style.display = 'block';
      // Írd ki az üzenetet, hogy a felhasználó beírja a verifikációs kódot
  } else {
      alert(data.detail || 'Hiba történt a bejelentkezés során!');
  }
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