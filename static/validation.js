const form = document.getElementById('form')
const firstname_input = document.getElementById('register_name')
const email_input = document.getElementById('login_email')
const password_input = document.getElementById('login_password')
const repeat_password_input = document.getElementById('repeat-password-input')
const error_message = document.getElementById('error-message')

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  let errors = []
  if(firstname_input){

    // If we have a firstname input then we are in the signup
    errors = await getSignupFormErrors(firstname_input.value, email_input.value, password_input.value, repeat_password_input.value)


    console.log(errors)
    console.log("errors.length: ", errors.length)

    if(errors.length > 0){
      // If there are any errors
      e.preventDefault()
      error_message.innerText  = errors.join(". ")
    }

  }
  else{
    // If we don't have a firstname input then we are in the loginű
    errors = getLoginFormErrors(email_input.value, password_input.value)
    if(errors.length > 0){
      // If there are any errors
      error_message.innerText  = errors.join(". ")
    }
    if (errors.length === 0) {
      console.log('loginUser2');
      const email = document.getElementById('login_email').value;
      const password = document.getElementById('login_password').value;
  
      try {
          // Itt várjuk meg a fetch válaszát
          const response = await fetch('http://127.0.0.1:8000/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({ username: email, password })
          });
  
          // Ellenőrizzük, hogy a válasz sikeres-e
          const data = await response.json();  // Az aszinkron válasz feldolgozása
  
          if (data.access_token) {
              localStorage.setItem('token', data.access_token);
              alert('Sikeres bejelentkezés OG!');
              window.location.href = "/catalog/catalog.html";
          } 
  
          if (data.status == "not_verified") {
              localStorage.setItem('verification_email', email);
              localStorage.setItem('verification_entity_id', data.id);
              updateVerificationUI();


          }else {
            error_message.innerText = "Invalid email or password";
            email_input.parentElement.classList.add('incorrect');
            password_input.parentElement.classList.add('incorrect');
            return;
        }
      } catch (error) {
          // Hiba kezelés: ha a fetch vagy a válasz hiba történik
          console.error('Hiba történt:', error);
          alert('Hiba történt a bejelentkezés során.');
      }
  }
  }



})

async function getSignupFormErrors(firstname, email, password, repeatPassword){
  let errors = []

  function isValidEmail(email) {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(email);
  }

  if (!isValidEmail(email)) {
    errors.push('Invalid email')
    email_input.parentElement.classList.add('incorrect')
  } 

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

  if(errors.length === 0){
    const loader = document.getElementById('loader-container');
    loader.style.setProperty('display', 'flex', 'important');
  const name = firstname;
  const response = await fetch('http://127.0.0.1:8000/users/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
  });

  // Kiválasztjuk a loader elemet

  const data = await response.json();
  loader.style.display = 'none';

  if (response.ok) {
      loader.style.display = 'none';

      localStorage.setItem('verification_email', email);
      localStorage.setItem('verification_entity_id', data.id);
      updateVerificationUI()

      // Verifikációs szekció megjelenítése
      //document.getElementById('verification_section').style.display = 'block';

      // Automatikusan beállítjuk az email-t és entity_id-t a verifikációhoz

      localStorage.setItem('randuin', password);
  } else {
      loader.style.display = 'none';

      if (data.detail == "Ez az email cím már regisztrálva van!"){
        errors.push('Email already exists')
        email_input.parentElement.classList.add('incorrect')
      }

      if (data.detail == "Ez a név már foglalt!"){
        errors.push('Name already exists')
        firstname_input.parentElement.classList.add('incorrect')
      }
  }
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
      document.getElementById('verification-message').textContent ='';
      document.getElementById('verification-message-2').style.color = 'red';
      document.getElementById('verification-message-2').textContent = data.error_id || 'Hiba történt az újraküldés során!';
    }
    else{
      //alert('Sikeres verifikáció! Átirányítás a catalog oldalra.');
    
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
    const loader = document.getElementById('loader-container');
    loader.style.setProperty('display', 'flex', 'important');
    const response = await fetch('http://127.0.0.1:8000/resend?' + new URLSearchParams({
      entity_type: 'user',
      entity_id: entityId,
      verification_process: 'EMAIL'
  }), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
  });

      const data = await response.json();
      loader.style.display = 'none';
      if (response.ok) {

          if(data.error){

            document.getElementById('verification-message').textContent = '';
            document.getElementById('verification-message-2').textContent = data.error || 'Hiba történt az újraküldés során!';
            document.getElementById('verification-message-2').style.color = 'red';
          }
          else{
            document.getElementById('verification-message').textContent = 'A kód újraküldésre került.';
            document.getElementById('verification-message').style.color = 'black';

            document.getElementById('verification-message-2').textContent = 'Add meg az e-mailre küldött kódot!';
            document.getElementById('verification-message-2').style.color = 'black';

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
      //alert('Sikeres bejelentkezés OG!');
      window.location.href = "/catalog/catalog.html";
  } if(data.status=="not_verified"){
    localStorage.setItem('verification_email', email);
    localStorage.setItem('verification_entity_id', data.id);

    await updateVerificationUI();


    //alert(data.message);
    document.getElementById('verification-message').textContent =data.message;
    document.getElementById('verification-message').style.color = 'red';

    document.getElementById('verification-message-2').style.color = 'red';
    document.getElementById('verification-message-2').textContent = 'Add meg az e-mailre küldött kódot!';

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
  const verificationCodeSubmit = document.getElementById('verification_code_submit');

  if (data.is_verified) {
    
    verificationSection.style.display = 'none';
    newVerificationButton.style.display = 'none';
  } else if (data.is_ongoing) {

    document.getElementById('verification-message').textContent ='Még nem verifikáltad magad!';
    document.getElementById('verification-message').style.color = 'red';

    document.getElementById('verification-message-2').style.color = 'red';
    document.getElementById('verification-message-2').textContent = 'Add meg az e-mailedre küldött kódot!';

    verificationSection.style.display = 'block';
    newVerificationButton.style.display = 'none';
    resendButton.style.display = 'block';
    codeInput.style.display = 'block';
    verificationCodeSubmit.style.display = 'inline-block';
    resendButton.style.display = 'inline-block';
    codeInput.style.display = 'inline-block';
  } else {
    document.getElementById('verification-message').textContent ='Még nem verifikáltad magad';
    document.getElementById('verification-message').style.color = 'red';

    document.getElementById('verification-message-2').style.color = 'red';
    document.getElementById('verification-message-2').textContent = 'Indíts új verifikációt!';
    verificationSection.style.display = 'block';
    resendButton.style.display = 'none';
    codeInput.style.display = 'none';
    verificationCodeSubmit.style.display = 'none';
    newVerificationButton.style.display = 'block';
  }
}

window.addEventListener('load', updateVerificationUI);



async function startNewVerification() {
  const email = localStorage.getItem('verification_email');
  const entityId = localStorage.getItem('verification_entity_id');
  if (!email || !entityId) return;
  console.log(entityId)
  const loader = document.getElementById('loader-container');
  loader.style.setProperty('display', 'flex', 'important');

  const response = await fetch('http://127.0.0.1:8000/start_verification?' + new URLSearchParams({
    entity_id: entityId
}), {
    method: 'POST'
});
const data = await response.json();
loader.style.display = 'none';

  if (response.ok) {
    await updateVerificationUI();
  } else {
    alert('Hiba történt a verifikáció indításakor!');
  }
}


async function getUserData() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
      // Felhasználói adatok lekérése
      const response = await fetch('http://127.0.0.1:8000/me', {
          method: 'GET',
          headers: { 'Authorization': 'Bearer ' + token }
      });

      const userData = await response.json();
      document.getElementById('userName').innerText = userData.name;
      document.getElementById('userEmail').innerText = userData.email;
      document.getElementById('userRole').innerText = userData.role;

      // Pending dokumentumok lekérése
      const pendingResponse = await fetch(`http://127.0.0.1:8000/pendingdocs/${userData.id}`);
      const pendingCount = await pendingResponse.json();

      const userTokenResponse = await fetch(`http://127.0.0.1:8000/usertokens/${userData.id}`);
      const userTokenCount = await userTokenResponse.json();

      document.getElementById('userTokens').innerText = userTokenCount.tokens;
      document.getElementById('pendingDocs').innerText = pendingCount;
      return userData;
  } catch (error) {
      console.error("Hiba a felhasználói adatok lekérése közben:", error);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const uploadSection = document.getElementById('upload-section');
  const logoutButton = document.getElementById('logout');
  const moderationButton = document.getElementById('moderation');
  const loginButton = document.getElementById('navbar-login');
  const userDropdown = document.getElementById('userDropdown');
  const myquizResults = document.getElementById('myquizresults');

  // Ha van token, akkor megjelenítjük a feltöltési szekciót
  if (token) {

      userDropdown.style.display = 'block';
      loginButton.style.display = 'none';
      logoutButton.style.display = 'block';
      myquizResults.style.display = 'block';
      const user_data = await getUserData();
  
      const userId = user_data.id;
      const role = user_data.role;
      if (role === 'admin' || role === 'moderator') {
          moderationButton.style.display = 'block';
      }
      if(role === 'user') {
          moderationButton.style.display = 'none';
      }

  } else {
      // Ha nincs token, elrejtjük a szekciót
      userDropdown.style.display = 'none';
      loginButton.style.display = 'block';
      logoutButton.style.display = 'none';
      moderationButton.style.display = 'none';
      myquizResults.style.display = 'none';
  }
});


document.getElementById('logout').addEventListener('click', () => {
  event.preventDefault();
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  window.location.reload();
});