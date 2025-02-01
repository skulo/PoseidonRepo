// Szimulált felhasználói adatok
const users = [
    { id: 1, name: "Kiss Péter", email: "peter.kiss@example.com" },
    { id: 2, name: "Nagy Anna", email: "anna.nagy@example.com" },
    { id: 3, name: "Szabó Gábor", email: "gabor.szabo@example.com" },
  ];
  
  // Felhasználók lekérése és megjelenítése
  function fetchUsers() {
    const tableBody = document.querySelector("#userTable tbody");
    tableBody.innerHTML = ""; // Előző tartalom törlése
  
    users.forEach(user => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${user.id}</td>
        <td>${user.name}</td>
        <td>${user.email}</td>
      `;
      tableBody.appendChild(row);
    });
  }
  
  // Az oldal betöltésekor automatikusan megjelenítjük a felhasználókat
  document.addEventListener("DOMContentLoaded", fetchUsers);
  