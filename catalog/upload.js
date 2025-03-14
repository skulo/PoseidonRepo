
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
    const fileName = document.querySelector('.file-name-input').value.trim() || 'untitled';
    
    if (selectedFiles.length === 0) {
        alert('Nincs kiválasztott fájl!');
        return;
    }

    if (groupedCheckbox.checked) {
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
            alert(data.message);
        } catch (error) {
            console.error('ZIP létrehozás hiba:', error);
            alert('Nem sikerült a ZIP létrehozása.');
        }
    } else {
        // Egyenkénti feltöltés
        let index = 1;
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
                //alert(data.message);

            } catch (error) {
                console.error('Feltöltési hiba:', error);
                alert(`Nem sikerült a feltöltés: ${file.name}`);
            }
        }

        window.location.reload()
    }
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
