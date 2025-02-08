// Token és felhasználói adatok kezelése
let token = localStorage.getItem('token');
let username = localStorage.getItem('username');
let isAdminOrModerator = false;
let selectedCategoryId = 1;

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
    selectedCategoryId = categoryId;
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
                    loadDocuments(selectedCategoryId); 
                    return;
                }
                }

                };
    
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

            }

            docCard.appendChild(docInfo);
            docCard.appendChild(docActions);

            documentsList.appendChild(docCard);
        }
    });
}


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


document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const uploadSection = document.getElementById('upload-section');
    const logoutButton = document.getElementById('logout');
    // Ha van token, akkor megjelenítjük a feltöltési szekciót
    if (token) {
        uploadSection.style.display = 'block';
        logoutButton.style.display = 'block';

    } else {
        // Ha nincs token, elrejtjük a szekciót
        uploadSection.style.display = 'none';
        logoutButton.style.display = 'none';
    }
});
