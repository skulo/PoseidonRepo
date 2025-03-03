// Feltételezzük, hogy a token és a userData már elérhető (például localStorage-ban)
const token = localStorage.getItem("token");

// A getUserData() függvény feltételezett implementációja, amely lekéri a bejelentkezett felhasználó adatait.
async function getUserData() {
  const response = await fetch("/me", {
    headers: { Authorization: "Bearer " + token },
  });
  return await response.json();
}

// Kvízeredmények lekérése a backendről
async function loadQuizResults() {
  if (!token) {
    alert("Nincs bejelentkezve!");
    window.location.href = "/static/login.html";
    return;
  }

  const response = await fetch("/quiz-results", {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
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
      <div class="document-date">${new Date(result.completed_at).toLocaleDateString()}</div>
      <div class="documents-category">${result.category}</div>
      <div class="document-title">${result.document_name}</div>
      <div class="document-description">${result.score} / ${result.total_questions}</div>
      <div class="document-actions">
        <button class="delete-btn" data-id="${result.quiz_result_id}">Törlés</button>
      </div>
    `;

    // Kattintás a kártyán (kivéve a törlés gombot) = újra kitöltés
    card.addEventListener("click", (event) => {
      if (!event.target.classList.contains("delete-btn")) {
        // Új kvíz kitöltés, navigáljunk a quiz oldalra a quiz_id paraméterrel
        window.location.href = `/quiz/quiz.html?quiz_id=${result.quiz_id}`;
      }
    });

    // Törlés gomb eseménykezelője
    const deleteBtn = card.querySelector(".delete-btn");
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation(); // ne aktiválja a kártya kattintást
      if (confirm("Biztosan törlöd ezt az eredményt?")) {
        await deleteQuizResult(result.quiz_result_id);
        loadQuizResults(); // Frissítsük a listát
      }
    });

    quizzesList.appendChild(card);
  });
}

// Kvízeredmény törlése
async function deleteQuizResult(resultId) {
  const response = await fetch(`/delete-quiz-result?quiz_result_id=${resultId}`, {
    method: "DELETE", // vagy POST, ha úgy van implementálva
    headers: { Authorization: "Bearer " + token },
  });

  if (!response.ok) {
    alert("Hiba történt a törlés során.");
  } else {
    console.log("Eredmény törölve!");
  }
}

// Felhasználói adatok betöltése (például a fejléchez)
async function loadUserInfo() {
  const userData = await getUserData();
  document.getElementById("userName").innerText = userData.name;
}

// Indítás
window.addEventListener("load", () => {
  loadUserInfo();
  loadQuizResults();
});


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
      myquizResults.style.display = 'none';
      loginButton.style.display = 'block';
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