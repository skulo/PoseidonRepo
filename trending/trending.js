// Token és felhasználói adatok kezelése
let token = localStorage.getItem('token');
let username = localStorage.getItem('username');
let isAdminOrModerator = false;

const urlParams = new URLSearchParams(window.location.search);

// Kilépés gomb funkció
document.getElementById('logout').addEventListener('click', () => {
    event.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.reload();
});


// Dokumentumok betöltése
async function loadDocuments(categoryId = null) {

    if (categoryId) {
        window.location.href = `/catalog/catalog.html?selectedCategoryId=${categoryId}`;

    }

    const responseCat = await fetch("http://127.0.0.1:8000/categories");
    const categories = await responseCat.json();

    const url = `/files/trending` 
    const response = await fetch(url);
    const documents = await response.json();

    const documentsList = document.getElementById('documents-list');
    documentsList.innerHTML = ''; 


    const url2 = `/files/recent` 
    const response2 = await fetch(url2);
    const documents2 = await response2.json();
    const recentList = document.getElementById('recent-list');
    recentList.innerHTML = ''; 



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

            // DOCUMENT CATEGORY

            const currentCategory = categories
            .map(cat => ({
                category: cat,
                child: cat.children.find(catchild => catchild.id === doc.category_id)
            }))
            .find(item => item.child !== undefined);

            console.log("Current category:", currentCategory);
            
            
            const categoryName = currentCategory.category.name;
            const childName = currentCategory.child.name;
            const docCategory = document.createElement('span');
            docCategory.className = 'documents-category';
            docCategory.innerText = `${categoryName} / ${childName}`;
            


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
                    const categoryIdDoc = doc.category_id;
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
                    formData.append('category_id', categoryIdDoc);
    
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

                            loadDocuments();  // Újratöltjük a dokumentumokat
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
                docActions.appendChild(editButton);

                

            };

            }


            docContainer.appendChild(docDate);
            docContainer.appendChild(docCategory);
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

    documents2.forEach(async doc => {
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

            // DOCUMENT CATEGORY
            const currentCategory = categories
            .map(cat => ({
                category: cat,
                child: cat.children.find(catchild => catchild.id === doc.category_id)
            }))
            .find(item => item.child !== undefined);

            console.log("Current category:", currentCategory);
            
            
            const categoryName = currentCategory.category.name;
            const childName = currentCategory.child.name;
            const docCategory = document.createElement('span');
            docCategory.className = 'documents-category';
            docCategory.innerText = `${categoryName} / ${childName}`;


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
                    const categoryIdDoc = doc.category_id;
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
                    formData.append('category_id', categoryIdDoc);
    
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

                            loadDocuments();  // Újratöltjük a dokumentumokat
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
                docActions.appendChild(editButton);

                

            };

            }


            docContainer.appendChild(docDate);
            docContainer.appendChild(docCategory);
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
            recentList.appendChild(docCard);
        }
    });
}


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

        document.getElementById('pendingDocs').innerText = pendingCount;
        return userData;
    } catch (error) {
        console.error("Hiba a felhasználói adatok lekérése közben:", error);
    }
}

// Az oldal betöltésekor lekérjük az adatokat
window.onload = getUserData;


// Dokumentumok betöltése az oldal betöltésekor
loadDocuments();



document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    //const uploadSection = document.getElementById('upload-section');
    const logoutButton = document.getElementById('logout');
    const moderationButton = document.getElementById('moderation');
    const loginButton = document.getElementById('navbar-login');
    const userDropdown = document.getElementById('userDropdown');

    // Ha van token, akkor megjelenítjük a feltöltési szekciót
    if (token) {

        userDropdown.style.display = 'block';
        loginButton.style.display = 'none';
        //uploadSection.style.display = 'block';
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
        //uploadSection.style.display = 'none';
        logoutButton.style.display = 'none';
    }
});