// Token és felhasználói adatok kezelése
let token = localStorage.getItem('token');
let username = localStorage.getItem('username');
let isAdminOrModerator = false;

const urlParams = new URLSearchParams(window.location.search);
let selectedCategoryId = urlParams.get('selectedCategoryId') || 1; 

// Kilépés gomb funkció
document.getElementById('logout').addEventListener('click', () => {
    event.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.reload();
});

// Feltöltési gomb aktiválása
document.getElementById('file-input').addEventListener('change', () => {
    document.getElementById('upload-button').disabled = !document.getElementById('file-input').files.length;
});

// Dokumentumok betöltése
async function loadDocuments(categoryId = null) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); 
    selectedCategoryId = categoryId;
    console.log("Selected categoryy ID:", selectedCategoryId);
    const url = categoryId ? `/files/${categoryId}` : '/files';  // Ha van categoryId, az adott kategóriát töltjük be
    const response = await fetch(url);
    const documents = await response.json();

    const documentsList = document.getElementById('documents-list');
    documentsList.innerHTML = ''; // Törlés a régi listáról

    const responseCat = await fetch("/categories");
    const categories = await responseCat.json();
	

    // Keresd meg a kategóriát, amelyben a selectedCategoryId szerepel
    const currentCategory = categories
    .map(cat => ({
        category: cat,
        child: cat.children.find(catchild => catchild.id === selectedCategoryId)
    }))
    .find(item => item.child !== undefined);

    if (currentCategory) {
    const categoryName = currentCategory.category.name;
    const childName = currentCategory.child.name;
    document.getElementById("documents-category-title").innerText = `${categoryName} / ${childName}`;
    }


    documents.forEach(async doc => {
        if (doc.status === 'approved') {
            console.log("download url:", doc.download_url);
            const docCard = document.createElement('div');
            docCard.className = 'document-card';
            

            const docContainer = document.createElement('div');

            // Upload date
            const docDate = document.createElement('span');
            docDate.className = 'document-date';
            docDate.innerText = doc.uploaded_at_display;

            // Document title
            const docTitle = document.createElement('span');
            docTitle.className = 'document-title';
            docTitle.innerText = doc.title;


            // Document description
            const docDescription = document.createElement('span');
            docDescription.className = 'document-description';
            docDescription.innerText = doc.description;
            
            const docActions = document.createElement('div');
            docActions.className = 'document-actions';

            //const downloadButton = document.createElement('button');
            //downloadButton.innerText = 'Download';
            //downloadButton.onclick = () => window.location.href = doc.download_url;

            //docActions.appendChild(downloadButton);

            const user_data = await getUserData();
            if (user_data) {
            

                
                
            const userId = user_data.id;
            const role = user_data.role;
            console.log("User ID:", userId);
                

            const waitForQuizReady = async (quizId) => {
                const maxRetries = 60;  // Max 5 percet várunk (60 * 5s = 300s)
                let attempts = 0;
                let loaderContainer = document.getElementById("loader-container");
                loaderContainer.style.setProperty('display', 'flex', 'important');
                
                while (attempts < maxRetries) {
                    const response = await fetch(`/check-quiz-status/${quizId}`);
                    const data = await response.json();
            
                    if (data.ready) {
                        loaderContainer.style.display = "none";
                        return;  // Kvíz kész van, kilépünk a ciklusból
                    }
            
                    await new Promise(resolve => setTimeout(resolve, 5000));  // Várakozás 5 másodpercet
                    attempts++;
                }
            
                //throw new Error('Túl hosszú ideig tartott a kvízgenerálás.');
            };

            
            const startQuizGeneration = async (lang, maxQuestions) => {
                try {
                    console.log('Kvízgenerálás elindítva...');
                    const user_data = await getUserData();
                    const userId = user_data.id;
                    const response = await fetch(`/generate-quiz/${doc.id}-${doc.file_name}?lang=${lang}&max_questions=${maxQuestions}&user_id=${userId}`, {
                        method: "GET",
                        signal: controller.signal
                    });
            
                    if (!response.ok) {
                        const errorData = await response.json(); // JSON hibaválasz beolvasása
                        throw new Error(errorData.message || errorData.detail || "Ismeretlen hiba történt.");
                    }
            
                    const quizData = await response.json();
                    const quizId = quizData.quiz_id;
                    //window.location.href = `/loader/loader.html?quiz_id=${quizId}`;

                    if (quizId) {
                        console.log(`Kvíz generálása folyamatban, ID: ${quizId}`);
                        await waitForQuizReady(quizId);  // 🔄 Itt várunk, amíg kész a kvíz
                        console.log('Kvíz készen áll!');
                        window.location.href = `/quiz/quiz.html?quiz_id=${quizId}`;
                    } else {
                        throw new Error('Érvénytelen válasz a szervertől');
                    }
            
                } catch (error) {
                    console.error("Hiba:", error.message);
                    alert(error.message);
                }
            };
            
            
            const showQuizSettingsModal = () => {
                const modal = document.createElement('div');
                modal.className = 'modal';
            
                modal.innerHTML = `
                    <div class="modal-content">
                        <h2>Kvíz beállítások</h2>
                        <label for="lang-select">Válassz nyelvet:</label>
                        <select id="lang-select">
                            <option value="magyar">Magyar</option>
                            <option value="angol">Angol</option>
                        </select>
                        <br>
                        <label for="max-questions">Maximum kérdésszám:</label>
                        <input type="number" id="max-questions" value="5" min="1" max="20">
                        <br>
                        <button id="start-quiz-btn">Indítás</button>
                        <button id="cancel-btn">Mégse</button>
                    </div>
                `;
            
                document.body.appendChild(modal);
            
                // Eseménykezelők
                document.getElementById('start-quiz-btn').onclick = () => {
                    const lang = document.getElementById('lang-select').value;
                    const maxQuestions = document.getElementById('max-questions').value;
                    document.body.removeChild(modal);
                    startQuizGeneration(lang, maxQuestions);
                };
            
                document.getElementById('cancel-btn').onclick = () => {
                    document.body.removeChild(modal);
                };
            };

            // Kvízgomb eseménykezelője

            const allowedExtensions = ['docx', 'pdf', 'ppt', 'txt', 'pptx'];
            const fileExtension = doc.file_name.split('.').pop().toLowerCase();
            if (allowedExtensions.includes(fileExtension)) {
            const quizButton = document.createElement('button');
            quizButton.innerText = 'Kvíz';
            quizButton.className = 'quiz-button';
            quizButton.onclick = showQuizSettingsModal;
            docActions.appendChild(quizButton);

            }

            if (role === 'admin' || role === 'moderator' || doc.uploaded_by === userId) {


                const deleteButton = document.createElement('button');
                deleteButton.innerText = 'Delete';
                deleteButton.className = 'delete-button';

                const editButton = document.createElement('button');
                editButton.innerText = 'Edit';
                editButton.className = 'edit-button';

                
                editButton.onclick = async () => {
                    deleteButton.style.display = 'none';
                    //downloadButton.style.display = 'none';
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
                        //downloadButton.style.display = 'inline-block';
                        editButton.style.display = 'inline-block';
                        return;
                    };

                    /* The line `fileInput.onchange = async (event) => {` is setting up an asynchronous
                    event listener for the `onchange` event of the `fileInput` element. This means
                    that when the user selects a new file using the file input element, the function
                    defined inside the event listener will be executed. */
                    submitButton.onclick = async () => {
                        const fileNew = fileInput.files[0];
                        const files = fileInput.files; // Több fájl esetén

                        const isGroupUpload = document.getElementById('group-upload').checked; // Csoportos feltöltés

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
                    formData.append('is_edit', true);
    
                    const response = await fetch('/upload/', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                        body: formData
                    });
                    const data = await response.json();
                    console.log("Edit upload response:", data);
                    if (data.message === 'ERROR') {
                        alert('File exceeded the maximum size of 5MB. Current size: ' + data.error + 'MB');
                        return;
                    }
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
                    //downloadButton.style.display = 'inline-block';
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


            docContainer.appendChild(docDate);
            docContainer.appendChild(docTitle);
            docContainer.appendChild(docDescription);
            docContainer.appendChild(docActions);

            docCard.appendChild(docContainer);
                            // Click event for download
                docCard.onclick = async (e) => {
                    if (!e.target.closest('.document-actions')) { 
                        try {
                            await fetch(`/api/documents/${doc.id}/increase_popularity`, {
                                method: "POST",
                            });
                
                            window.location.href = doc.download_url;
                        } catch (error) {
                            console.error("Hiba történt a popularity növelése közben:", error);
                        }
                    }
                };
            documentsList.appendChild(docCard);
        }
    });
}


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

// Az oldal betöltésekor lekérjük az adatokat
window.onload = getUserData;


// Feltöltési funkció
document.getElementById('upload-button').addEventListener('click', async () => {
    const file = document.getElementById('file-input').files[0];
    const title = document.getElementById('title-input').value;
    const description = document.getElementById('description-input').value;

    
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Nincs bejelentkezve felhasználó');
        return null;
    }

    const user_data = await getUserData();
    const userId = user_data.id;
    const role = user_data.role;
    const formData = new FormData();
    formData.append('uploaded_by', userId);
    formData.append('file', file);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('role', role);
    formData.append('category_id', selectedCategoryId);
    


    // Debug log a formData tartalmához
    formData.forEach((value, key) => {
        console.log(key + ": " + value);
    });

    const response = await fetch('/upload/', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });

    const data = await response.json();
    if (data.message === 'ERROR') {
        alert('File exceeded the maximum size of 5MB. Current size: ' + data.error + 'MB');
        return;
    }
    if (data.message === 'File is uploaded successfully.') {
        alert('File is uploaded successfully.');
        loadDocuments(selectedCategoryId);
        return;
    }
    if (data.message === 'File is uploaded successfully, and is waiting for approval.') {
        alert('File is uploaded successfully, and is waiting for approval.');
        loadDocuments(selectedCategoryId);
        return;
    } else {
        alert('Upload failed');
    }
});

// Dokumentumok betöltése az oldal betöltésekor
loadDocuments(selectedCategoryId);


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
        uploadSection.style.display = 'none';
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
        loginButton.style.display = 'block';
        uploadSection.style.display = 'none';
        moderationButton.style.display = 'none';
        myquizResults.style.display = 'none';

        logoutButton.style.display = 'none';
    }
});



