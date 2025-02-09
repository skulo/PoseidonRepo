async function loadPendingFiles() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert("Nincs bejelentkezve.");
        return;
    }

    

    const response = await fetch('/moderations/files', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token 
        }
    });

    if (!response.ok) {
        alert("Nem sikerült betölteni a függő fájlokat.");
        return;
    }

    const files = await response.json();
    const container = document.getElementById('pending-files-container');
    container.innerHTML = "";

    files.forEach(file => {
        const fileElement = document.createElement('div');
        fileElement.classList.add('file-item');

        fileElement.innerHTML = `
            <h3>${file.title}</h3>
            <p>${file.description}</p>
            <a href="${file.download_url}" target="_blank"><button>Letöltés</button></a>
            <button class="approve-btn" data-id="${file.id}">Jóváhagyás</button>
            <input type="text" class="reject-reason" placeholder="Elutasítás oka">
            <button class="reject-btn" data-id="${file.id}" disabled>Elutasítás</button>
        `;

        // Az elutasítás gomb aktiválása, ha az input mező ki van töltve
        const rejectInput = fileElement.querySelector('.reject-reason');
        const rejectBtn = fileElement.querySelector('.reject-btn');
        rejectInput.addEventListener('input', () => {
            rejectBtn.disabled = rejectInput.value.trim() === "";
        });

        // Jóváhagyás eseménykezelő
        fileElement.querySelector('.approve-btn').addEventListener('click', async () => {
            await approveFile(file.id);
            loadPendingFiles();
        });

        // Elutasítás eseménykezelő
        rejectBtn.addEventListener('click', async () => {
            await rejectFile(file.id, rejectInput.value);
            loadPendingFiles();
        });

        container.appendChild(fileElement);
    });
}

// Jóváhagyás függvény
async function approveFile(fileId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`/moderations/approve/${fileId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.ok) {
        alert("Fájl jóváhagyva.");
    } else {
        alert("Hiba történt a jóváhagyás során.");
    }



    const responsee = await fetch('http://127.0.0.1:8000/me', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await responsee.json();
    const sender = data.email;


    const responseAboutUser = await fetch(`/filesinfo/${fileId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    const dataUser = await responseAboutUser.json();

    console.log(dataUser);

    const receiver = dataUser.usremail;
    const fileTitle = dataUser.title;

    const emailResponse = await fetch(`http://127.0.0.1:8000/email/decision?recipient_email=${receiver}&title=${fileTitle}&sender=${sender}&decision=approved`, {
        method: 'GET'
    });

    if (emailResponse.ok) {
        alert("Értesítő email elküldve.");
    } else {
        alert("Nem sikerült elküldeni az emailt.");
    }


}

// Elutasítás függvény
async function rejectFile(fileId, reason) {
    const token = localStorage.getItem('token');
    const response = await fetch(`/moderations/reject/${fileId}?reason=${encodeURIComponent(reason)}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.ok) {
        alert("Fájl elutasítva.");
    } else {
        alert("Hiba történt az elutasítás során.");
    }

    const responsee = await fetch('http://127.0.0.1:8000/me', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await responsee.json();
    const sender = data.email;


    const responseAboutUser = await fetch(`/filesinfo/${fileId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    const dataUser = await responseAboutUser.json();

    console.log(dataUser);

    const receiver = dataUser.usremail;
    const fileTitle = dataUser.title;
    const delete_url = dataUser.delete_url;


    const emailResponse = await fetch(`http://127.0.0.1:8000/email/decision?recipient_email=${receiver}&title=${fileTitle}&sender=${sender}&decision=rejected&rejection_reason=${reason}`, {
        method: 'GET'
    });

    
    if (emailResponse.ok) {
        alert("Értesítő email elküldve.");
    } else {
        alert("Nem sikerült elküldeni az emailt.");
    }

    const responseDelete = await fetch(delete_url, {
        method: 'DELETE',  
        headers: {
            'Authorization': `Bearer ${token}`, 
        },
    });

    if (responseDelete.ok) {
        console.log("File deleted successfully.");
        //loadDocuments(selectedCategoryId);  
    }


    
}

// Moderációs oldal betöltése
loadPendingFiles();


window.onload = async function() {
    const token = localStorage.getItem('token');
if (!token) {
    if (!token) {
        document.getElementById('auth-link').style.display = 'block';
    return;
}
    }

const response = await fetch('http://127.0.0.1:8000/me', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
});
};


async function getUserData() {
const token = localStorage.getItem('token');
if (!token) {
    //alert('Először jelentkezz be!');
    return;
}

const response = await fetch('http://127.0.0.1:8000/me', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
});
const data = await response.json();
document.getElementById('user_data').innerText = JSON.stringify(data, null, 2);
return data;
}

// Dinamikus kategória betöltés
async function loadCategories() {
const response = await fetch('http://127.0.0.1:8000/categories');
const categories = await response.json();

const categoryContainer = document.getElementById('category-container');

categories.forEach(category => {
const categoryColumn = document.createElement('div');
categoryColumn.classList.add('column');

const categoryTitle = document.createElement('h3');
categoryTitle.textContent = category.name;
categoryColumn.appendChild(categoryTitle);

category.children.forEach(subcategory => {
    const subcategoryLink = document.createElement('a');
    subcategoryLink.href = "#";
    subcategoryLink.textContent = subcategory.name;
    
    // Eseménykezelő hozzáadása, hogy betöltsük az adott kategóriához tartozó fájlokat
    subcategoryLink.onclick = async (e) => {
        const dropdownContent = document.querySelector('.dropdown-content');
        dropdownContent.style.display = dropdownContent.style.display === 'none' || dropdownContent.style.display === '' ? 'block' : 'none';
        e.preventDefault();
        await loadDocuments(subcategory.id);  // Az alábbi kódban ezt a category_id-t használjuk
    };

    categoryColumn.appendChild(subcategoryLink);
});

categoryContainer.appendChild(categoryColumn);
});
}


window.onload = loadCategories; // Kategóriák betöltése oldal betöltésekor


// Dropdown gombra hover eseményfigyelő hozzáadása
document.querySelector('.dropbtn').addEventListener('mouseenter', () => {
const dropdownContent = document.querySelector('.dropdown-content');
dropdownContent.style.display = 'block';  // Hoverkor megjelenítjük
});

document.querySelector('.dropdown-content').addEventListener('mouseenter', () => {
const dropdownContent = document.querySelector('.dropdown-content');
dropdownContent.style.display = 'block';  // Hoverkor megjelenítjük
});
document.querySelector('.dropdown-content').addEventListener('mouseleave', () => {
const dropdownContent = document.querySelector('.dropdown-content');
dropdownContent.style.display = 'none';  // Hoverkor megjelenítjük
});

// Dropdown gombra hoverről való eltávolítás (mouseleave)
document.querySelector('.dropbtn').addEventListener('mouseleave', () => {
const dropdownContent = document.querySelector('.dropdown-content');
dropdownContent.style.display = 'none';  // Hover elhagyásakor eltüntetjük
});






