// Token és felhasználói adatok kezelése
let token = localStorage.getItem('token');
let username = localStorage.getItem('username');
let isAdminOrModerator = false;

if (token) {
    // Ellenőrizzük, hogy admin vagy moderátor-e
    const payload = JSON.parse(atob(token.split('.')[1]));
    isAdminOrModerator = payload.role === 'admin' || payload.role === 'moderator';
    username = payload.username;
    document.getElementById('username').innerHTML = `Logged in as: <strong>${username}</strong>`;
    document.getElementById('logout').style.display = 'inline-block';
} else {
    document.getElementById('username').innerHTML = 'Logged in as: <strong>Guest</strong>';
}

// Kilépés gomb funkció
document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.reload();
});

// Feltöltési gomb aktiválása
document.getElementById('file-input').addEventListener('change', () => {
    document.getElementById('upload-button').disabled = !document.getElementById('file-input').files.length;
});

// Dokumentumok betöltése
async function loadDocuments() {
    const response = await fetch('/files');
    const documents = await response.json();

    const documentsList = document.getElementById('documents-list');
    documentsList.innerHTML = ''; // Törlés a régi listáról

    documents.forEach(doc => {
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
        //const user_data = getUserData();
        //const userId = user_data.id;

        //if (isAdminOrModerator || doc.uploaded_by === username) {
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
                    loadDocuments();  // Újratöltjük a dokumentumokat
                } else {
                    const errorResponse = await response.json();
                    console.error("Failed to delete file:", errorResponse.detail);
                }
            } catch (error) {
                console.error("Error during delete request:", error);
            }
        };
        
        
        
            docActions.appendChild(deleteButton);
        //}

        docCard.appendChild(docInfo);
        docCard.appendChild(docActions);

        documentsList.appendChild(docCard);
    });
}

// Törlés gomb funkció
async function deleteFile(filePath) {
    console.log("File path received in deleteFile:", filePath);
    //const fileName = new URL(filePath).pathname.split('/').pop();
    const fileName = filePath.split('/').pop();
    console.log("Extracted fileName:", fileName); 
    //console.log(fileName);

    const deleteUrl = `/delete/${filePath}`;
    console.log("Delete request URL:", deleteUrl);

    const response = await fetch(`/delete/${fileName}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.ok) {
        loadDocuments();
    } else {
        alert('Failed to delete file');
    }
}

async function getUserData() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Először jelentkezz be!');
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
    const formData = new FormData();
    formData.append('uploaded_by', userId);
    formData.append('file', file);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category_id', "1");
    


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
    if (data.message === 'File uploaded successfully.') {
        loadDocuments();
    } else {
        alert('Upload failed');
    }
});

// Dokumentumok betöltése az oldal betöltésekor
loadDocuments();
