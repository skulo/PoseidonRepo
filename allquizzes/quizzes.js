

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
