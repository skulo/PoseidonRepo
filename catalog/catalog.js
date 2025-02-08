// Token és felhasználói adatok kezelése
let token = localStorage.getItem('token');
let username = localStorage.getItem('username');
let isAdminOrModerator = false;
let selectedCategoryId = 1;

// Kilépés gomb funkció
//document.getElementById('logout').addEventListener('click', () => {
  //  localStorage.removeItem('token');
    //localStorage.removeItem('username');
    //window.location.reload();
//6});

// Feltöltési gomb aktiválása
document.getElementById('file-input').addEventListener('change', () => {
    document.getElementById('upload-button').disabled = !document.getElementById('file-input').files.length;
});

// Dokumentumok betöltése
async function loadDocuments(categoryId = null) {
    selectedCategoryId = categoryId;
    const url = categoryId ? `/files/${categoryId}` : '/files';  // Ha van categoryId, az adott kategóriát töltjük be
    const response = await fetch(url);
    const documents = await response.json();

    const documentsList = document.getElementById('documents-list');
    documentsList.innerHTML = ''; // Törlés a régi listáról


    documents.forEach(async doc => {
        if (doc.status === 'approved') {
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
            const userId = user_data.id;
            const role = user_data.role;
            console.log("User ID:", userId);
            if (role === 'admin' || role === 'moderator' || doc.uploaded_by === userId) {
                const deleteButton = document.createElement('button');
                deleteButton.innerText = 'Delete';
                deleteButton.className = 'delete-button';
            // console.log("Uploaded by:", doc.file_path);
            deleteButton.onclick = async () => {
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
            }

            docCard.appendChild(docInfo);
            docCard.appendChild(docActions);

            documentsList.appendChild(docCard);
        }
    });
}

// Törlés gomb funkció
async function deleteFile(filePath) {
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




