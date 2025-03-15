
const dropArea = document.querySelector('.drop-section');
const listSection = document.querySelector('.list-section');
const listContainer = document.querySelector('.list');
const fileSelector = document.querySelector('.file-selector');
const fileSelectorInput = document.querySelector('.file-selector-input');
const uploadButton = document.querySelector('.upload-b');
const groupedCheckbox = document.querySelector('.grouped-checkbox');
const fileNameInput = document.querySelector('.file-name-input');

let selectedFiles = [];

// Böngésző gombbal való fájlválasztás
fileSelector.onclick = () => fileSelectorInput.click();
fileSelectorInput.onchange = () => {
    [...fileSelectorInput.files].forEach((file) => {

        addFileToList(file);
        
    });
};

// Drag & drop események

dropArea.ondragover = (e) => {
    e.preventDefault();
    dropArea.classList.add('drag-over-effect');
};

dropArea.ondragleave = () => dropArea.classList.remove('drag-over-effect');

dropArea.ondrop = (e) => {
    e.preventDefault();
    dropArea.classList.remove('drag-over-effect');
    
    [...e.dataTransfer.files].forEach((file) => {

        addFileToList(file);
        
    });
};

// Fájltípus ellenőrzése
function typeValidation(type) {
    return ['application/pdf', 'image', 'video'].some(validType => type.startsWith(validType));
}

// Fájlok listához adása
function addFileToList(file) {
    listSection.style.display = 'block';
    selectedFiles.push(file);
    
    const li = document.createElement('li');
    li.classList.add('in-prog');
    li.innerHTML = `
        <div class="col">
            <img src="icons/${iconSelector(file.type)}" alt="">
        </div>
        <div class="col">
            <div class="file-name">
                <div class="name">${file.name}</div>
                <span>${(file.size / (1024 * 1024)).toFixed(2)} MB</span>
            </div>
            <div class="file-size">${(file.size / (1024 * 1024)).toFixed(2)} MB</div>
        </div>
        <div class="col">
            <button class="remove-file">❌</button>
        </div>
    `;
    listContainer.appendChild(li);
    
    li.querySelector('.remove-file').onclick = () => {
        selectedFiles = selectedFiles.filter(f => f !== file);
        li.remove();
    };
}

// Fájlok feltöltése gombnyomásra
const inputField = document.querySelector('.file-name-input');

inputField.addEventListener('input', () => {
    if (inputField.value.length > 14) {
        inputField.value = inputField.value.slice(0, 14); // Levágja a 12 karaktert meghaladó részt
    }
});

document.querySelector('.upload-b').addEventListener('click', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Nincs bejelentkezve felhasználó');
        return;
    }

    const userData = await getUserData();
    const userId = userData.id;
    const role = userData.role;
    const groupedCheckbox = document.querySelector('.grouped-checkbox');
    //const fileName = document.querySelector('.file-name-input').value.trim() || 'untitled';
    const fileName = inputField.value.trim() || 'untitled';
    if (selectedFiles.length === 0) {
        alert('Nincs kiválasztott fájl!');
        return;
    }
    

    if (groupedCheckbox.checked) {

        if (selectedFiles.length > 15) {
            showAlert("danger", 'Maximum 15 fájlt lehet egy ZIP-be csoportosítani.');
            return;
        }
        // Csoportosított ZIP-es feltöltés
        const zip = new JSZip();
        selectedFiles.forEach(file => zip.file(file.name, file));

        try {
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const formData = new FormData();
            formData.append('file', zipBlob, `${fileName}.zip`);
            formData.append('title', fileName);
            formData.append('description', `${fileName}.zip`);
            formData.append('uploaded_by', userId);
            formData.append('role', role);
            formData.append('category_id', selectedCategoryId);

            const response = await fetch('/upload/', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const data = await response.json();

            if (data.message === 'ERROR') {
                showAlert("danger",'File exceeded the maximum size of 5MB. Current size: ' + data.error + 'MB');
                return;
            }
            if (data.message === 'File is uploaded successfully.') {
                showAlert("success", data.message);
            }
            if (data.message === 'File is uploaded successfully, and is waiting for approval.') {
                showAlert("info", data.message);
  
            }

        } catch (error) {
            console.error('ZIP létrehozás hiba:', error);
            alert('Nem sikerült a ZIP létrehozása.');
        }
    } else {
        // Egyenkénti feltöltés

        if (selectedFiles.length > 5) {
            showAlert("danger", 'Maximum 5 fájlt lehet egyszerre feltölteni.');
            return;
        }

        let index = 1;
        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

        for (const file of selectedFiles) {
            if (file.size > MAX_FILE_SIZE) {
                //alert(`Egy fájl túl nagy! Mérete: ${(file.size / 1024 / 1024).toFixed(2)} MB. A maximális méret 5 MB.`);
                showAlert("danger", `Egy fájl túl nagy! Mérete: ${(file.size / 1024 / 1024).toFixed(2)} MB. A maximális méret 5 MB.`);
                return; // Leállítjuk a feltöltési folyamatot
            }

        }
        for (const file of selectedFiles) {
            const formData = new FormData();

            const isMultiple = selectedFiles.length > 1;
            const numberedFileName = isMultiple ? `${fileName}_${index}` : fileName;
            
            formData.append('file', file);
            formData.append('title', numberedFileName);
            formData.append('description', file.name);
            formData.append('uploaded_by', userId);
            formData.append('role', role);
            formData.append('category_id', selectedCategoryId);
            index++;

            try {
                await new Promise(resolve => setTimeout(resolve, 500));
                const response = await fetch('/upload/', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                const data = await response.json();

                if (data.message === 'ERROR') {
                    alert('File exceeded the maximum size of 5MB. Current size: ' + data.error + 'MB');
                    return;
                }
                if (data.message === 'File is uploaded successfully.') {
                    showAlert("success", data.message);
                    
                }
                if (data.message === 'File is uploaded successfully, and is waiting for approval.') {
                    showAlert("info", data.message);

                    //loadDocuments(selectedCategoryId);
                }

                //alert(data.message);

            } catch (error) {
                console.error('Feltöltési hiba:', error);
                alert(`Nem sikerült a feltöltés: ${file.name}`);
            }
        }


        //window.location.reload()
    }
    loadDocuments(selectedCategoryId);
    clearForm();  // Töröljük a feltöltési űrlapot
    hideListSection(); 
});

// Feltöltési válaszok kezelése
function handleUploadResponse(data) {
    if (data.message.includes('successfully')) {
        alert(data.message);
        listContainer.innerHTML = '';
        selectedFiles = [];
    } else {
        alert('Feltöltés sikertelen!');
    }
}


// Ikon kiválasztása fájltípus szerint
function iconSelector(type) {
    return type.includes('pdf') ? 'pdf.png' : type.includes('image') ? 'image.png' : 'file.png';
}


function clearForm() {
    const fileInput = document.querySelector('.file-selector-input');
    
    fileInput.value = '';  // Reseteljük a fájlválasztó inputot
    selectedFiles = [];    // Kiürítjük a selectedFiles tömböt
    
    document.querySelector('.file-name-input').value = '';  // Reseteljük a fájlnév inputot
    const listSection = document.querySelector('.list');
    listSection.innerHTML = '';    // Kiürítjük a fájlok listáját
}

// Elrejtjük a list-section div-et
function hideListSection() {
    const listSection = document.querySelector('.list-section');
    listSection.style.display = 'none';  // Rejtsük el a list-section-t
}