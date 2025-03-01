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
    // Példa objektum: 
    // {
    //   quiz_result_id: "result_123",
    //   quiz_id: "quiz_456",
    //   score: 5,
    //   total_questions: 6,
    //   category: "Történelem"
    // }

    const card = document.createElement("div");
    card.className = "document-card"; // ugyanaz a stílus mint moderationban

    card.innerHTML = `
      <div class="document-date">${new Date().toLocaleDateString()}</div>
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
