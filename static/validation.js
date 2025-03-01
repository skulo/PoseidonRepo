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
    // If we don't have a firstname input then we are in the loginű
    errors = getLoginFormErrors(email_input.value, password_input.value)
    if(errors.length > 0){
      // If there are any errors
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
      localStorage.setItem('verification_email', email);
      localStorage.setItem('verification_entity_id', data.id);
      updateVerificationUI()

      // Verifikációs szekció megjelenítése
      //document.getElementById('verification_section').style.display = 'block';

      // Automatikusan beállítjuk az email-t és entity_id-t a verifikációhoz

      localStorage.setItem('randuin', password);
  } else {
      alert(data.detail || 'Hiba történt a regisztráció során!');
  }
}

async function verifyCode() {
  const verificationCode = document.getElementById('verification_code').value;
  const email = localStorage.getItem('verification_email');
  const entityId = localStorage.getItem('verification_entity_id');
  const password = localStorage.getItem('login_password');

  const emailtoken = document.getElementById('login_email').value;
  const passwordtoken = document.getElementById('login_password').value;
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
    if(data.error_id){
      alert(data.error_id || 'Hiba történt az újraküldés során!');
    }
    else{
      alert('Sikeres verifikáció! Átirányítás a catalog oldalra.');
    
      loginUser();


  
}
  } else {
      alert('Nem ok a response');
  }
}

async function resendVerificationCode() {
  const email = localStorage.getItem('verification_email');
  const entityId = localStorage.getItem('verification_entity_id');
  console.log(email, entityId)
  if (!email || !entityId) {
      alert('Hiba: nincs érvényes regisztrációs adat!');
      return;
  }

  try {
    const response = await fetch('http://127.0.0.1:8000/resend?' + new URLSearchParams({
      entity_type: 'user',
      entity_id: entityId,
      verification_process: 'EMAIL'
  }), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
  });

      const data = await response.json();

      if (response.ok) {

          if(data.error){
            alert(data.error || 'Hiba történt az újraküldés során!');
          }
          else{
            alert('Az új verifikációs kód elküldve az email címedre!');
          }
          
      } else {
          alert(data.error || 'Hiba történt az újraküldés során!');
      }

  } catch (error) {
      console.error('Hiba történt:', error);
      alert('Hálózati hiba! Próbáld újra később.');
  }
}













async function loginUser() {
  console.log('loginUser')
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
  } if(data.status=="not_verified"){
    localStorage.setItem('verification_email', email);
    localStorage.setItem('verification_entity_id', data.id);

    await updateVerificationUI();
    alert(data.message);
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

window.addEventListener('load', async () => {
  await fetch('http://127.0.0.1:8000/expire_ongoing_verification_runs', { method: 'POST' });
});





async function updateVerificationUI() {
  const email = localStorage.getItem('verification_email');
  const entityId = localStorage.getItem('verification_entity_id');
  if (!email || !entityId) return;

  const response = await fetch('http://127.0.0.1:8000/is_verified?' + new URLSearchParams({
    entity_id: entityId
  }));
  const data = await response.json();

  const verificationSection = document.getElementById('verification_section');
  const newVerificationButton = document.getElementById('new_verification_button');
  const resendButton = document.querySelector('#verification_section button[onclick*="resendVerificationCode"]');
  const codeInput = document.getElementById('verification_code');

  if (data.is_verified) {
    verificationSection.style.display = 'none';
    newVerificationButton.style.display = 'none';
  } else if (data.is_ongoing) {
    verificationSection.style.display = 'block';
    newVerificationButton.style.display = 'none';
    resendButton.style.display = 'inline-block';
    codeInput.style.display = 'inline-block';
  } else {
    verificationSection.style.display = 'none';
    newVerificationButton.style.display = 'block';
  }
}

window.addEventListener('load', updateVerificationUI);



async function startNewVerification() {
  const email = localStorage.getItem('verification_email');
  const entityId = localStorage.getItem('verification_entity_id');
  if (!email || !entityId) return;
  console.log(entityId)

  const response = await fetch('http://127.0.0.1:8000/start_verification?' + new URLSearchParams({
    entity_id: entityId
}), {
    method: 'POST'
});

  if (response.ok) {
    alert('Új verifikációs folyamat indítva!');
    await updateVerificationUI();
  } else {
    alert('Hiba történt a verifikáció indításakor!');
  }
}


