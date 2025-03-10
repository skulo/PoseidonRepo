

// Kvízeredmények lekérése a backendről
async function loadQuizResults() {


  const response = await fetch("/quiz-all", {
    method: "GET",
  });

  if (!response.ok) {
    alert("Nem sikerült betölteni a kvízeredményeket.");
    return;
  }

  const quizResults = await response.json();
  displayQuizResults(quizResults);
}

// Megjelenítés
function displayQuizResults(results) {
  const quizzesList = document.getElementById("quizzes-list");
  quizzesList.innerHTML = "";

  results.forEach((result) => {

    const card = document.createElement("div");
    card.className = "document-card"; // ugyanaz a stílus mint moderationban

    card.innerHTML = `
      <div class="document-date">${new Date(result.created_at).toLocaleDateString()}</div>
      <div class="documents-category">${result.category}</div>
      <div class="document-title">${result.document_name}</div>
      <div class="document-description">${result.total_questions} Questions</div>
    `;

    // Kattintás a kártyán (kivéve a törlés gombot) = újra kitöltés
    card.addEventListener("click", (event) => {
      if (!event.target.classList.contains("delete-btn")) {
        // Új kvíz kitöltés, navigáljunk a quiz oldalra a quiz_id paraméterrel
        window.location.href = `/quiz/quiz.html?quiz_id=${result.quiz_id}`;
      }
    });


    quizzesList.appendChild(card);
  });
}



// Felhasználói adatok betöltése (például a fejléchez)

// Indítás
window.addEventListener("load", () => {
  loadQuizResults();
});

async function getUserData() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
      // Felhasználói adatok lekérése
      const response = await fetch('/me', {
          method: 'GET',
          headers: { 'Authorization': 'Bearer ' + token }
      });

      const userData = await response.json();
      document.getElementById('userName').innerText = userData.name;
      document.getElementById('userEmail').innerText = userData.email;
      document.getElementById('userRole').innerText = userData.role;

      // Pending dokumentumok lekérése
      const pendingResponse = await fetch(`/pendingdocs/${userData.id}`);
      const pendingCount = await pendingResponse.json();

      const userTokenResponse = await fetch(`/usertokens/${userData.id}`);
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
      myquizResults.style.display = 'block';
      logoutButton.style.display = 'block';
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
      myquizResults.style.display = 'none';
      moderationButton.style.display = 'none';

      logoutButton.style.display = 'none';
  }
});


document.getElementById('logout').addEventListener('click', () => {
  event.preventDefault();
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  window.location.reload();
});
