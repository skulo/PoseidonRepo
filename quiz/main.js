let quizData = []; // Itt tároljuk majd a kvíz adatokat
let MAX_QUESTIONS = 0;
async function loadQuiz() {
  // Lekérdezzük a kvíz ID-t az URL-ből
  const urlParams = new URLSearchParams(window.location.search);
  const quizId = urlParams.get('quiz_id');
  if (!quizId) {
    alert("Nincs kvíz ID megadva!");
    return;
  }

  // Kvíz adatainak lekérése az API-ról
  const response = await fetch(`/get-quiz/${quizId}`);
  const data = await response.json();
  quizData = data.questions;  
  MAX_QUESTIONS = quizData.length;  // Itt állítjuk be dinamikusan a kérdésszámot
  // A kérdések adatai a válaszban
  

}
  
loadQuiz();
  const quizContainer = document.querySelector(".quiz-container");
  const question = document.querySelector(".quiz-container .question");
  const options = document.querySelector(".quiz-container .options");
  const nextBtn = document.querySelector(".quiz-container .next-btn");
  const quizResult = document.querySelector(".quiz-result");
  const startBtnContainer = document.querySelector(".start-btn-container");
  const startBtn = document.querySelector(".start-btn-container .start-btn");
  
  let questionNumber = 0;
  let score = 0;
  
  const shuffleArray = (array) => {
    return array.slice().sort(() => Math.random() - 0.5);
  };
  
  quizData = shuffleArray(quizData);
  
  const resetLocalStorage = () => {
    for (i = 0; i < MAX_QUESTIONS; i++) {
      localStorage.removeItem(`userAnswer_${i}`);
    }
  };
  
  resetLocalStorage();
  
  const checkAnswer = (e) => {
    let userAnswer = e.target.textContent;
    if (userAnswer === quizData[questionNumber].correct) {
      score++;
      e.target.classList.add("correct");
    } else {
      e.target.classList.add("incorrect");
    }
  
    localStorage.setItem(`userAnswer_${questionNumber}`, userAnswer);
  
    let allOptions = document.querySelectorAll(".quiz-container .option");
    allOptions.forEach((o) => {
      o.classList.add("disabled");
    });
  };
  
  const createQuestion = () => {
  
    options.innerHTML = "";
    question.innerHTML = `<span class='question-number'>${
      questionNumber + 1
    }/${MAX_QUESTIONS}</span>${quizData[questionNumber].question}`;
  
    const shuffledOptions = shuffleArray(quizData[questionNumber].options);
  
    shuffledOptions.forEach((o) => {
      const option = document.createElement("button");
      option.classList.add("option");
      option.innerHTML = o;
      option.addEventListener("click", (e) => {
        checkAnswer(e);
      });
      options.appendChild(option);
    });
  };
  
  const retakeQuiz = () => {
    questionNumber = 0;
    score = 0;
    quizData = shuffleArray(quizData);
    resetLocalStorage();
  
    createQuestion();
    quizResult.style.display = "none";
    quizContainer.style.display = "block";
  };
  
  const displayQuizResult = () => {

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
            // Pending dokumentumok lekérése
            const pendingResponse = await fetch(`http://127.0.0.1:8000/pendingdocs/${userData.id}`);
            const pendingCount = await pendingResponse.json();
    
            return userData;
        } catch (error) {
            console.error("Hiba a felhasználói adatok lekérése közben:", error);
        }
    }


    const userData = getUserData();


    quizResult.style.display = "flex";
    quizContainer.style.display = "none";
    quizResult.innerHTML = "";
  
    const resultHeading = document.createElement("h2");
    resultHeading.innerHTML = `You have scored ${score} out of ${MAX_QUESTIONS}.`;
    quizResult.appendChild(resultHeading);
  
    for (let i = 0; i < MAX_QUESTIONS; i++) {
      const resultItem = document.createElement("div");
      resultItem.classList.add("question-container");
  
      const userAnswer = localStorage.getItem(`userAnswer_${i}`);
      const correctAnswer = quizData[i].correct;
  
      let answeredCorrectly = userAnswer === correctAnswer;
  
      if (!answeredCorrectly) {
        resultItem.classList.add("incorrect");
      }
  
      resultItem.innerHTML = `<div class="question">Question ${i + 1}: ${
        quizData[i].question
      }</div>
      <div class="user-answer">Your answer: ${userAnswer || "Not Answered"}</div>
      <div class="correct-answer">Correct answer: ${correctAnswer}</div>`;
  
      quizResult.appendChild(resultItem);
    }
  
    const retakeBtn = document.createElement("button");
    retakeBtn.classList.add("retake-btn");
    retakeBtn.innerHTML = "Retake Quiz";
    retakeBtn.addEventListener("click", retakeQuiz);
    quizResult.appendChild(retakeBtn);


    const sendQuizResult = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const quizId = urlParams.get('quiz_id');
        const userData = await getUserData();

        const userId = userData.id; 
      
        const response = await fetch(`/save-quiz-result?quiz_id=${quizId}&user_id=${userId}&score=${score}`, {
            method: "POST"
        });
      
        if (response.ok) {
          console.log("Eredmény sikeresen elmentve!");
        } else {
          console.error("Hiba történt az eredmény mentésekor.");
        }
      };
      
      if (userData){
        sendQuizResult();
      }

      
  };
  
  const displayNextQuestion = () => {
    if (questionNumber >= MAX_QUESTIONS - 1) {
      displayQuizResult();
      return;
    }
  
    questionNumber++;
    createQuestion();
  };
  
  nextBtn.addEventListener("click", displayNextQuestion);
  
  startBtn.addEventListener("click", () => {
    startBtnContainer.style.display = "none";
    quizContainer.style.display = "block";
    createQuestion();
  });


// URL paraméterekből lekéri a kvíz ID-t
const urlParams = new URLSearchParams(window.location.search);
const quizId = urlParams.get('quiz_id');

// Kategória név betöltése
const loadCategoryName = async () => {
    const response = await fetch(`/quiz-category?quiz_id=${quizId}`);
    if (response.ok) {
        const data = await response.json();
        document.querySelector("h1").innerText = `${data.category_name} Quiz`;
        document.querySelector(".start-btn-container h2").innerText = data.category_name;
    } else {
        console.error("Hiba történt a kategória betöltésekor.");
    }
};

// Betöltés indítása
loadCategoryName();
document.addEventListener("DOMContentLoaded", () => {
  const quitBtns = document.querySelectorAll(".quit-btn"); // Minden quit gombot kiválasztunk

  quitBtns.forEach((quitBtn) => {
    quitBtn.addEventListener("click", (e) => {
      const confirmQuit = confirm("Are you sure you want to quit? All progress will be lost.");
      if (confirmQuit) {
        window.history.back(); // Visszairányít az előző oldalra
      }
    });
  });
});