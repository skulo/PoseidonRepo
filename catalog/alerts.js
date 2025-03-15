function showAlert(type, message) {
    const validTypes = ["success", "info", "warning", "danger"];
    if (!validTypes.includes(type)) {
        console.error("Hibás alert típus:", type);
        return;
    }

    // Ellenőrizzük, hogy létezik-e már egy alert konténer
    let alertContainer = document.querySelector(".alert-container");
    if (!alertContainer) {
        alertContainer = document.createElement("div");
        alertContainer.className = "alert-container";
        document.body.appendChild(alertContainer);
    }

    // Új alert létrehozása
    let alertBox = document.createElement("div");
    alertBox.className = `alert ${type}`;
    alertBox.innerHTML = `
        <span class="closebtn">&times;</span>
        <strong>${message}</strong>
    `;

    // Hozzáadjuk az alertet a konténerhez
    alertContainer.appendChild(alertBox);

    // Bezárás gombra kattintáskor eltűnik
    alertBox.querySelector(".closebtn").addEventListener("click", function() {
        alertBox.style.opacity = "0";
        setTimeout(() => alertBox.remove(), 600);
    });

    // Automatikusan eltűnik 3 másodperc után
    setTimeout(() => {
        alertBox.style.opacity = "0";
        setTimeout(() => alertBox.remove(), 600);
    }, 6000);
}
