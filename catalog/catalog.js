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

        if (isAdminOrModerator || doc.uploaded_by === username) {
            const deleteButton = document.createElement('button');
            deleteButton.innerText = 'Delete';
            deleteButton.className = 'delete-button';
            deleteButton.onclick = () => deleteFile(doc.file_path);
            docActions.appendChild(deleteButton);
        }

        docCard.appendChild(docInfo);
        docCard.appendChild(docActions);

        documentsList.appendChild(docCard);
    });
}

// Törlés gomb funkció
async function deleteFile(filePath) {
    const response = await fetch(`/delete/${filePath}`, {
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

// Feltöltési funkció
document.getElementById('upload-button').addEventListener('click', async () => {
    const file = document.getElementById('file-input').files[0];
    const title = document.getElementById('title-input').value;
    const description = document.getElementById('description-input').value;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('description', description);

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
