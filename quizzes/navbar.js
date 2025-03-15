window.onload = async function () {
    const token = localStorage.getItem("token");
    if (!token) {
      if (!token) {
        document.getElementById("auth-link").style.display = "block";
        return;
      }
    }

    const response = await fetch("/me", {
      method: "GET",
      headers: { Authorization: "Bearer " + token },
    });
  };

  // Dinamikus kategória betöltés
  async function loadCategories() {
    const response = await fetch("/categories");
    const categories = await response.json();

    const categoryContainer = document.getElementById("category-container");
    categoryContainer.innerHTML = "";
    categories.forEach((category) => {
      const categoryColumn = document.createElement("div");
      categoryColumn.classList.add("column");

      const categoryTitle = document.createElement("h3");
      categoryTitle.textContent = category.name;
      categoryColumn.appendChild(categoryTitle);

      category.children.forEach((subcategory) => {
        const subcategoryLink = document.createElement("a");
        subcategoryLink.href = "#";
        subcategoryLink.textContent = subcategory.name;

        // Eseménykezelő hozzáadása, hogy betöltsük az adott kategóriához tartozó fájlokat
        subcategoryLink.onclick = async (e) => {
          const dropdownContent =
            document.querySelector(".dropdown-content");
          dropdownContent.style.display =
            dropdownContent.style.display === "none" ||
            dropdownContent.style.display === ""
              ? "block"
              : "none";
          e.preventDefault();
          window.location.href = `/catalog/catalog.html?selectedCategoryId=${subcategory.id}`; // Az alábbi kódban ezt a category_id-t használjuk
        };

        categoryColumn.appendChild(subcategoryLink);
      });

      categoryContainer.appendChild(categoryColumn);
    });
  }

  window.onload = loadCategories; // Kategóriák betöltése oldal betöltésekor

  // Dropdown gombra hover eseményfigyelő hozzáadása
  document.querySelector(".dropbtn").addEventListener("mouseenter", () => {
    const dropdownContent = document.querySelector(".dropdown-content");
    dropdownContent.style.display = "block"; // Hoverkor megjelenítjük
  });

  document
    .querySelector(".dropdown-content")
    .addEventListener("mouseenter", () => {
      const dropdownContent = document.querySelector(".dropdown-content");
      dropdownContent.style.display = "block"; // Hoverkor megjelenítjük
    });
  document
    .querySelector(".dropdown-content")
    .addEventListener("mouseleave", () => {
      const dropdownContent = document.querySelector(".dropdown-content");
      dropdownContent.style.display = "none"; // Hoverkor megjelenítjük
    });

  // Dropdown gombra hoverről való eltávolítás (mouseleave)
  document.querySelector(".dropbtn").addEventListener("mouseleave", () => {
    const dropdownContent = document.querySelector(".dropdown-content");
    dropdownContent.style.display = "none"; // Hover elhagyásakor eltüntetjük
  });


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