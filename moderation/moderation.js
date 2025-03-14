async function loadPendingFiles() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert("Nincs bejelentkezve.");
        window.location.href = "/static/login.html";
        return;
    }

    const user_data = await getUserData();
    if (user_data.role === 'user') {
        alert("Nincs jogosultságod a moderációs oldal megtekintésére.");
        window.location.href = "/catalog/catalog.html";
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
    const responseCat = await fetch("http://127.0.0.1:8000/categories");
    const categories = await responseCat.json();

    const files = await response.json();
    const documentsList = document.getElementById('documents-list');
    documentsList.innerHTML = "";

    const url2 = `/moderation-logs` 
    const response2 = await fetch(url2);
    const documents2 = await response2.json();
    const recentList = document.getElementById('recent-list');
    recentList.innerHTML = ''; 


    files.forEach(file => {
        // Formázott dátum
        const uploadDate = new Date(file.uploaded_at);
        const formattedDate = `${uploadDate.getMonth() + 1}/${uploadDate.getDate()}/${uploadDate.getFullYear()}`;

        const fileElement = document.createElement('div');
        fileElement.classList.add('document-card');

        const currentCategory = categories
        .map(cat => ({
            category: cat,
            child: cat.children.find(catchild => catchild.id === file.category_id)
        }))
        .find(item => item.child !== undefined);

        const categoryText = currentCategory 
        ? `${currentCategory.category.name} / ${currentCategory.child.name}` 
        : "Ismeretlen kategória";

        fileElement.innerHTML = `
            <div class="document-date">${formattedDate}</div>
            <div class="documents-category">${categoryText}</div>
            <div class="document-title">${file.title}</div>
            <div class="document-description">${file.description}</div>
            <div class="document-actions">
                <button class="approve-btn" data-id="${file.id}">Jóváhagyás</button>
                <input type="text" class="reject-reason" placeholder="Elutasítás oka">
                <button class="reject-btn" data-id="${file.id}" disabled>Elutasítás</button>
            </div>
        `;

        // Kattintás = letöltés
        fileElement.addEventListener('click', (event) => {
            if (!event.target.classList.contains('approve-btn') && !event.target.classList.contains('reject-btn') && !event.target.classList.contains('reject-reason')) {
                window.open(file.download_url, '_blank');
            }
        });

        // Elutasítás input eseménykezelő
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

        documentsList.appendChild(fileElement);
    });

    documents2.forEach(async doc => {
            const docCard = document.createElement('div');
            docCard.className = 'document-card';
            

            const docContainer = document.createElement('div');

            // Upload date
            const docDate = document.createElement('span');

            const decisionDate = new Date(doc.created_at);
            const formattedDate = `${decisionDate.getMonth() + 1}/${decisionDate.getDate()}/${decisionDate.getFullYear()}`;

            docDate.className = 'document-date';
            docDate.innerText = formattedDate;

            // Document title
            const docTitle = document.createElement('span');
            docTitle.className = 'document-title';
            docTitle.innerText = doc.decision;

            const docName = document.createElement('span');
            docName.className = 'document-name';
            docName.innerText = doc.document_title;

            const docUploader = document.createElement('span');
            docUploader.className = 'document-uploader';
            docUploader.innerText = doc.email;

            docContainer.appendChild(docUploader);
            docContainer.appendChild(docName);
            docContainer.appendChild(docDate);
            docContainer.appendChild(docTitle);

            docCard.appendChild(docContainer);
            recentList.appendChild(docCard);
        
    });
}


// Jóváhagyás függvény
async function approveFile(fileId) {
    const token = localStorage.getItem('token');

    const user_data = await getUserData();
    
    const role = user_data.role;
    if (role === 'user') {
        alert("Nincs jogosultságod a moderációs oldal megtekintésére.");
        window.location.href = "/catalog/catalog.html";

        return;
    }
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
    const username = dataUser.usrname;

    const emailResponse = await fetch(`http://127.0.0.1:8000/email/decision?recipient_email=${receiver}&title=${fileTitle}&sender=${sender}&username=${username}&decision=approved&fileId=${fileId}`, {
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

    const user_data = await getUserData();
    
    const role = user_data.role;
    if (role === 'user') {
        alert("Nincs jogosultságod a moderációs oldal megtekintésére.");
        window.location.href = "/catalog/catalog.html";

        return;
    }


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
    const username = dataUser.usrname;

    const emailResponse = await fetch(`http://127.0.0.1:8000/email/decision?recipient_email=${receiver}&title=${fileTitle}&sender=${sender}&username=${username}&decision=rejected&fileId=${fileId}&rejection_reason=${reason}`, {
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

window.onload =getUserData;
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






document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const uploadSection = document.getElementById('upload-section');
    const logoutButton = document.getElementById('logout');
    const moderationButton = document.getElementById('moderation');
    const loginButton = document.getElementById('navbar-login');
    const userDropdown = document.getElementById('userDropdown');

    // Ha van token, akkor megjelenítjük a feltöltési szekciót
    if (token) {

        userDropdown.style.display = 'block';
        loginButton.style.display = 'none';
        uploadSection.style.display = 'block';
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
        uploadSection.style.display = 'none';
        logoutButton.style.display = 'none';
    }
});



async function loadDocuments(categoryId = null) {

    
    selectedCategoryId = categoryId;

    window.location.href = `/catalog/catalog.html?selectedCategoryId=${categoryId}`;

    console.log("Selected category ID:", selectedCategoryId);



    const url = categoryId ? `/files/${categoryId}` : '/files';  // Ha van categoryId, az adott kategóriát töltjük be
    const response = await fetch(url);
    const documents = await response.json();

    const documentsList = document.getElementById('documents-list');
    documentsList.innerHTML = ''; // Törlés a régi listáról


    documents.forEach(async doc => {
        if (doc.status === 'approved') {
            console.log("download url:", doc.download_url);
            const docCard = document.createElement('div');
            docCard.className = 'document-card';
            
            const docInfo = document.createElement('div');
            docInfo.innerHTML = `
                <h3>${doc.title}</h3>
                <p>${doc.description}</p>
                <p>Uploaded at: ${doc.uploaded_at}</p>
            `;
            
            const docActions = document.createElement('div');
            const downloadButton = document.createElement('button');
            downloadButton.innerText = 'Download';
            downloadButton.onclick = () => window.location.href = doc.download_url;

            docActions.appendChild(downloadButton);


            const user_data = await getUserData();
            if (user_data) {
            
            const userId = user_data.id;
            const role = user_data.role;
            console.log("User ID:", userId);
            if (role === 'admin' || role === 'moderator' || doc.uploaded_by === userId) {
                const deleteButton = document.createElement('button');
                deleteButton.innerText = 'Delete';
                deleteButton.className = 'delete-button';

                const editButton = document.createElement('button');
                editButton.innerText = 'Edit';
                editButton.className = 'edit-button';

                
                editButton.onclick = async () => {
                    deleteButton.style.display = 'none';
                    downloadButton.style.display = 'none';
                    editButton.style.display = 'none';

                    const title = doc.title;
                    const description = doc.description
                    const deleteurl = doc.delete_url;
                    const token = localStorage.getItem('token');
                    if (!token) {
                        alert('Nincs bejelentkezve felhasználó');
                        return null;
                    }
    
                    const user_data = await getUserData();
                    const userId = user_data.id;
                    const role = user_data.role;
    
    
                    let fileInput = editButton.parentElement.querySelector('.edit-file-input');
                    if (!fileInput) {
                        fileInput = document.createElement('input');
                        fileInput.type = 'file';
                        fileInput.id = 'edit-file-input';
                        fileInput.classList.add('edit-file-input');
                         // Látható legyen
                        editButton.insertAdjacentElement('afterend', fileInput); // Gomb után helyezzük be
                    }
                    fileInput.style.display = 'block';
                    fileInput.click();


                    const cancelButton = document.createElement('button');
                    cancelButton.innerText = 'Cancel';
                    cancelButton.classList.add('cancelButton');
                    docActions.appendChild(cancelButton);

                    const submitButton = document.createElement('button');
                    submitButton.innerText = 'Submit';
                    submitButton.classList.add('submitButton');
                    docActions.appendChild(submitButton);

                    cancelButton.onclick = () => {
                        fileInput.style.display = 'none';
                        cancelButton.style.display = 'none';
                        submitButton.style.display = 'none';
                        deleteButton.style.display = 'inline-block';  // Eredeti gombok vissza
                        downloadButton.style.display = 'inline-block';
                        editButton.style.display = 'inline-block';
                        return;
                    };

                    /* The line `fileInput.onchange = async (event) => {` is setting up an asynchronous
                    event listener for the `onchange` event of the `fileInput` element. This means
                    that when the user selects a new file using the file input element, the function
                    defined inside the event listener will be executed. */
                    submitButton.onclick = async () => {
                        const fileNew = fileInput.files[0];
                        if (!fileNew) {
                            alert('Kérlek válassz fájlt!');
                            return;
                        }
                    //const fileInput = document.getElementById('edit-file-input');
                    //const fileNew = fileInput.files[0];
                    const formData = new FormData();
                    formData.append('uploaded_by', userId);
                    formData.append('file', fileNew);
                    formData.append('title', title);
                    formData.append('description', description);
                    formData.append('role', role);
                    formData.append('category_id', selectedCategoryId);
    
                    const response = await fetch('/upload/', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                        body: formData
                    });
                    const data = await response.json();
                    console.log("Edit upload response:", data);
                    if (data.message === 'File is uploaded successfully.') {
                        alert('File is uploaded successfully.');
                    }
                    if (data.message === 'File is uploaded successfully, and is waiting for approval.') {
                        alert('File is uploaded successfully, and is waiting for approval.');
                    }
    
    
                    try {
                        const response = await fetch(deleteurl, {
                            method: 'DELETE',  // Itt biztosítjuk, hogy DELETE kérés legyen
                            headers: {
                                'Authorization': `Bearer ${token}`,  // Ha szükséges, hozzáadhatod a token-t
                            },
                        });
                
                        if (response.ok) {
                            console.log("File deleted successfully.");

                            loadDocuments(selectedCategoryId);  // Újratöltjük a dokumentumokat
                        } else {
                            const errorResponse = await response.json();
                            console.error("Failed to delete file:", errorResponse.detail);
                        }
                    } catch (error) {
                        console.error("Error during delete request:", error);
                    }


                    fileInput.style.display = 'none';
                    cancelButton.style.display = 'none';
                    submitButton.style.display = 'none';
                    deleteButton.style.display = 'inline-block';  // Eredeti gombok vissza
                    downloadButton.style.display = 'inline-block';
                    editButton.style.display = 'inline-block';
                }
                }

                
    
                // console.log("Uploaded by:", doc.file_path);
                deleteButton.onclick = async () => {
                    console.log("Delete button clicked, url:", doc.delete_url);
                    try {
                        const response = await fetch(doc.delete_url, {
                            method: 'DELETE',  // Itt biztosítjuk, hogy DELETE kérés legyen
                            headers: {
                                'Authorization': `Bearer ${token}`,  // Ha szükséges, hozzáadhatod a token-t
                            },
                        });
                
                        if (response.ok) {
                            console.log("File deleted successfully.");
                            
                            loadDocuments(selectedCategoryId);  // Újratöltjük a dokumentumokat
                        } else {
                            const errorResponse = await response.json();
                            console.error("Failed to delete file:", errorResponse.detail);
                        }
                    } catch (error) {
                        console.error("Error during delete request:", error);
                    }
                };

            
            
            
            
                docActions.appendChild(deleteButton);
                docActions.appendChild(editButton);

            };

            }

            docCard.appendChild(docInfo);
            docCard.appendChild(docActions);

            documentsList.appendChild(docCard);
        }
    });
}



document.getElementById('logout').addEventListener('click', () => {
    event.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.reload();
  });