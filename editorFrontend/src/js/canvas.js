document.addEventListener('DOMContentLoaded', function () {
    const editorElement = document.getElementById('editor');
    const editorContainer = document.getElementById('editorContainer');
    const noFileSelected = document.getElementById('noFileSelected');
    const currentFileName = document.getElementById('currentFileName');
    const languageSelect = document.getElementById('languageSelect');
    const themeSelect = document.getElementById('themeSelect');
    const settingsButton = document.getElementById('settingsButton');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettings = document.getElementById('closeSettings');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const shareCodeBtn = document.getElementById('shareCodeBtn');
    const connectionStatus = document.getElementById('connectionStatus');
    const saveStatus = document.getElementById('saveStatus');
    const createFileBtn = document.getElementById('createFileBtn');
    const createFolderBtn = document.getElementById('createFolderBtn');
    const saveFileBtn = document.getElementById('saveFileBtn');
    const fileTree = document.getElementById('fileTree');
    const repoNameElement = document.getElementById('repoName');
    const fileCreationModal = document.getElementById('fileCreationModal');
    const fileNameInput = document.getElementById('fileNameInput');
    const confirmCreateFile = document.getElementById('confirmCreateFile');
    const cancelCreateFile = document.getElementById('cancelCreateFile');
    let socket = null;
    let isCollaborating = false;
    let currentFile = null; // Stores { id, path }
    let currentRevision = 0; // Add this near the top of your DOMContentLoaded event handler

    const urlParams = new URLSearchParams(window.location.search);
    const repoId = urlParams.get('repoId');

    async function fetchRepositoryName() {
        if (!repoId) {
            repoNameElement.textContent = "No repository selected";
            return;
        }
        try {
            const token = sessionStorage.getItem('authToken');
            const response = await fetch(`http://127.0.0.1:8000/fs/repositories/${repoId}/`, {
                headers: { Authorization: `Token ${token}` },
            });
            if (response.ok) {
                const repoData = await response.json();
                repoNameElement.textContent = repoData.name;
            } else {
                repoNameElement.textContent = "Failed to load repository";
            }
        } catch (error) {
            console.error('Error fetching repository:', error);
            repoNameElement.textContent = "Error loading repository";
        }
    }

    const editor = CodeMirror.fromTextArea(editorElement, {
        lineNumbers: true,
        mode: languageSelect.value,
        theme: 'dracula', // Set dark theme as default
        matchBrackets: true,
        lineWrapping: true,
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter", "CodeMirror-lint-markers"],
        lint: true,
    });

    // Make sure dark mode toggle is checked by default
    darkModeToggle.checked = true;

    darkModeToggle.addEventListener('change', function () {
        const isDark = this.checked;
        document.documentElement.classList.toggle('dark', isDark);
        document.body.classList.toggle('dark', isDark);
        settingsModal.classList.toggle('dark', isDark);
        editor.setOption('theme', isDark ? 'dracula' : 'default');
    });

    // Load initial file tree
    async function loadFileTree() {
        try {
            const token = sessionStorage.getItem('authToken');
            const response = await fetch(`http://127.0.0.1:8000/fs/repositories/${repoId}/files/`, {
                headers: { Authorization: `Token ${token}` },
            });
            if (response.ok) {
                const files = await response.json();
                fileTree.querySelector('.file-tree').innerHTML = '';
                files.forEach(file => addFileToTree(file));
            } else {
                console.error('Failed to load file tree:', await response.json());
            }
        } catch (error) {
            console.error('Error loading file tree:', error);
        }
    }

    // Replace the existing addFileToTree function
    function addFileToTree(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item p-2 hover:bg-gray-700 rounded flex items-center';
        fileItem.dataset.fileId = file.id;  // Add file ID as data attribute
        
        // Check if this is the current file and add active class
        if (currentFile && currentFile.id === file.id) {
            fileItem.classList.add('active');
        }
    
        fileItem.innerHTML = `
            <i class="fas fa-file-code mr-2"></i>
            <span>${file.path}</span>
            <div class="file-actions">
                <button class="delete-file-btn text-red-500 hover:text-red-400">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // Add click event for the file
        fileItem.querySelector('span').addEventListener('click', () => {
            // Remove active class from all files
            document.querySelectorAll('.file-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Add active class to clicked file
            fileItem.classList.add('active');
            
            currentFile = { id: file.id, path: file.path };
            currentFileName.textContent = file.path;
            showEditor();
            loadFileContent(file.id);
        });
        
        // Add delete functionality
        fileItem.querySelector('.delete-file-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteFile(file.id, file.path);
        });
        
        fileTree.querySelector('.file-tree').appendChild(fileItem);
    }

    function showEditor() {
        editorContainer.style.display = 'block';
        noFileSelected.style.display = 'none';
    }

    function hideEditor() {
        editorContainer.style.display = 'none';
        noFileSelected.style.display = 'flex';
        currentFile = null;
        currentFileName.textContent = 'No file selected';
    }

    function loadFileContent(fileId) {
        console.log('Loading file:', fileId);  // Debug log
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'openFile',
                fileId: fileId
            }));
        } else {
            console.error('WebSocket not connected');
        }
    }

    function setLanguageMode(fileExt) {
        let mode = 'javascript'; // default
        
        if (fileExt === 'py') mode = 'python';
        else if (fileExt === 'html' || fileExt === 'htm') mode = 'htmlmixed';
        else if (fileExt === 'css') mode = 'css';
        else if (fileExt === 'php') mode = 'php';
        else if (fileExt === 'rb') mode = 'ruby';
        else if (fileExt === 'go') mode = 'go';
        
        // Load the mode if not already loaded
        if (mode !== 'javascript') {
            const script = document.createElement('script');
            script.src = `https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/mode/${mode}/${mode}.min.js`;
            document.head.appendChild(script);
        }
        
        // Update select and editor mode
        languageSelect.value = mode;
        editor.setOption('mode', mode);
    }

    async function saveFile() {
        if (currentFile) {
            const content = editor.getValue();
            try {
                const token = sessionStorage.getItem('authToken');
                // Update the endpoint URL to match your backend
                const response = await fetch(`http://127.0.0.1:8000/fs/repositories/${repoId}/files/${currentFile.id}/`, {
                    method: 'PATCH',  // Changed from POST to PATCH
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Token ${token}`,
                    },
                    body: JSON.stringify({
                        content: content,
                        path: currentFile.path  // Include the path
                    })
                });
                
                if (response.ok) {
                    showSaveSuccess();

                    // After successful save, notify WebSocket
                    if (socket && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            type: 'codeUpdate',  // Changed from 'fileUpdated' to 'codeUpdate'
                            fileId: currentFile.id,
                            content: content
                        }));
                    }
                } else {
                    const errorData = await response.json();
                    console.error('Failed to save file:', errorData);
                    alert(`Failed to save file: ${errorData.detail || 'Unknown error'}`);
                }
            } catch (error) {
                console.error('Error saving file:', error);
                alert('Error saving file. Check console for details.');
            }
        } else {
            alert('No file is currently open.');
        }
    }

    function showSaveSuccess() {
        saveStatus.style.display = 'block';
        setTimeout(() => {
            saveStatus.style.display = 'none';
        }, 2000);
    }

    async function deleteFile(fileId, filePath) {
        if (confirm(`Are you sure you want to delete ${filePath}?`)) {
            try {
                const token = sessionStorage.getItem('authToken');
                const response = await fetch(`http://127.0.0.1:8000/fs/repositories/${repoId}/files/${fileId}/`, {
                    method: 'DELETE',
                    headers: { Authorization: `Token ${token}` },
                });
                
                if (response.ok) {
                    // If current file is being deleted, hide editor
                    if (currentFile && currentFile.id === fileId) {
                        hideEditor();
                    }
                    
                    // Refresh file tree
                    loadFileTree();
                } else {
                    console.error('Failed to delete file:', await response.json());
                    alert('Failed to delete file. Check console for details.');
                }
            } catch (error) {
                console.error('Error deleting file:', error);
                alert('Error deleting file. Check console for details.');
            }
        }
    }

    createFileBtn.addEventListener('click', () => {
        fileCreationModal.style.display = 'flex';
    });

    cancelCreateFile.addEventListener('click', () => {
        fileCreationModal.style.display = 'none';
        fileNameInput.value = '';
    });

    confirmCreateFile.addEventListener('click', async () => {
        const fileName = fileNameInput.value.trim();
        if (fileName && /^[a-zA-Z0-9._-]+$/.test(fileName)) { // Sanitize input
            try {
                const token = sessionStorage.getItem('authToken');
                const payload = { path: fileName, content: '' };
                const response = await fetch(`http://127.0.0.1:8000/fs/repositories/${repoId}/files/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Token ${token}`,
                    },
                    body: JSON.stringify(payload),
                });
                if (response.ok) {
                    const newFile = await response.json();
                    addFileToTree(newFile);
                    fileCreationModal.style.display = 'none';
                    fileNameInput.value = '';
                    
                    // Automatically open the new file
                    currentFile = { id: newFile.id, path: newFile.path };
                    currentFileName.textContent = newFile.path;
                    showEditor();
                    editor.setValue('');
                    setLanguageMode(newFile.path.split('.').pop().toLowerCase());
                } else {
                    const errorData = await response.json();
                    console.error('Failed to create file:', errorData);
                    alert(`Failed to create file: ${JSON.stringify(errorData)}`);
                }
            } catch (error) {
                console.error('Error creating file:', error);
                alert('Error creating file. Check console for details.');
            }
        } else {
            alert('Invalid file name. Use only letters, numbers, dots, underscores, or hyphens.');
        }
    });

    saveFileBtn.addEventListener('click', saveFile);

    shareCodeBtn.addEventListener('click', function () {
        if (!isCollaborating) {
            collaborationModal.style.display = 'flex';
        } else {
            if (socket) socket.close();
        }
    });

    settingsButton.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
    });

    closeSettings.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    languageSelect.addEventListener('change', function () {
        editor.setOption('mode', languageSelect.value);
        editor.refresh();
    });

    themeSelect.addEventListener('change', function () {
        editor.setOption('theme', themeSelect.value);
    });

    function debounce(func, delay) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // Initialize
    fetchRepositoryName().then(loadFileTree);

    // Add after the existing declarations in DOMContentLoaded
    const collaborationModal = document.getElementById('collaborationModal');
    const createRoomModal = document.getElementById('createRoomModal');
    const joinRoomModal = document.getElementById('joinRoomModal');
    const createRoomBtn = document.getElementById('createRoomBtn');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    const confirmCreateRoom = document.getElementById('confirmCreateRoom');
    const cancelCreateRoom = document.getElementById('cancelCreateRoom');
    const confirmJoinRoom = document.getElementById('confirmJoinRoom');
    const cancelJoinRoom = document.getElementById('cancelJoinRoom');
    const collaboratorEmail = document.getElementById('collaboratorEmail');
    const verificationCode = document.getElementById('verificationCode');

    // Update the shareCodeBtn click handler
    shareCodeBtn.addEventListener('click', function() {
        if (!isCollaborating) {
            collaborationModal.style.display = 'flex';
        } else {
            if (socket) socket.close();
        }
    });

    // Add handlers for room creation and joining
    createRoomBtn.addEventListener('click', () => {
        collaborationModal.style.display = 'none';
        createRoomModal.style.display = 'flex';
    });

    joinRoomBtn.addEventListener('click', () => {
        collaborationModal.style.display = 'none';
        joinRoomModal.style.display = 'flex';
    });

    cancelCreateRoom.addEventListener('click', () => {
        createRoomModal.style.display = 'none';
        collaboratorEmail.value = '';
    });

    cancelJoinRoom.addEventListener('click', () => {
        joinRoomModal.style.display = 'none';
        verificationCode.value = '';
    });

    confirmCreateRoom.addEventListener('click', async () => {
        const email = collaboratorEmail.value.trim();
        if (!email) {
            alert('Please enter a valid email address');
            return;
        }

        try {
            const response = await fetch('http://127.0.0.1:8000/collab/generate-code/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${sessionStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ emails: [email] })
            });

            if (response.ok) {
                const data = await response.json();
                initializeWebSocket(data.code);
                createRoomModal.style.display = 'none';
                collaboratorEmail.value = '';
                alert('Invitation sent! Room created successfully.');
            } else {
                const error = await response.json();
                alert(`Failed to create room: ${error.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error creating room:', error);
            alert('Failed to create room. Please try again.');
        }
    });

    confirmJoinRoom.addEventListener('click', () => {
        const code = verificationCode.value.trim();
        if (!code) {
            alert('Please enter a verification code');
            return;
        }

        initializeWebSocket(code);
        joinRoomModal.style.display = 'none';
        verificationCode.value = '';
    });

    // Update the WebSocket initialization function
    function initializeWebSocket(token) {
        connectionStatus.textContent = 'Connecting...';
        connectionStatus.className = 'connection-status';
        connectionStatus.style.display = 'block';

        // Debug log
        console.log('Attempting to connect with token:', token);

        const wsUrl = token 
            ? `ws://localhost:8000/ws/editor/?token=${encodeURIComponent(token)}`
            : 'ws://localhost:8000/ws/editor/';
        console.log('WebSocket URL:', wsUrl);

        socket = new WebSocket(wsUrl);

        socket.onopen = function() {
            console.log('WebSocket connection established');
            connectionStatus.textContent = 'Connected!';
            connectionStatus.classList.add('connected');
            setTimeout(() => connectionStatus.style.display = 'none', 2000);
        };

        socket.onmessage = function(event) {
            const message = JSON.parse(event.data);
            console.log('Received message:', message);

            switch(message.type) {
                case 'update':
                case 'fileUpdated':
                    if (currentFile && message.fileId === currentFile.id) {
                        const currentPos = editor.getCursor();
                        if (editor.getValue() !== message.content) {
                            editor.setValue(message.content);
                            editor.setCursor(currentPos);  // Preserve cursor position
                        }
                        currentRevision = message.revision || currentRevision;
                    }
                    break;
                case 'fileData':
                    console.log('Received file data:', message); // Debug log
                    if (currentFile && message.fileId === currentFile.id) {
                        console.log('Setting editor content:', message.content); // Debug log
                        editor.setValue(message.content || '');
                        currentRevision = message.revision || 0;  // Reset revision counter
                        showEditor();
                    }
                    break;
                case 'collaboration_started':
                    isCollaborating = true;
                    shareCodeBtn.classList.add('collaboration-active');
                    shareCodeBtn.querySelector('span').textContent = 'Stop Sharing';
                    break;
                case 'error':
                    console.error('Server error:', message.message);
                    alert(message.message);
                    break;
            }
        };

        socket.onerror = function(error) {
            console.error('WebSocket Error:', error);
            connectionStatus.textContent = 'Connection Failed!';
            connectionStatus.classList.add('error');
        };

        socket.onclose = function() {
            console.log('WebSocket connection closed');
            isCollaborating = false;
            shareCodeBtn.classList.remove('collaboration-active');
            shareCodeBtn.querySelector('span').textContent = 'Share Code';
            connectionStatus.textContent = 'Disconnected';
            setTimeout(() => connectionStatus.style.display = 'none', 3000);
        };
    }

    // Initialize WebSocket connection when page loads
    initializeWebSocket();

    // Update the editor change handler
    editor.on('change', debounce(function(cm, change) {
        if (socket && socket.readyState === WebSocket.OPEN && currentFile) {
            socket.send(JSON.stringify({
                type: 'codeUpdate',  // Changed from 'fileUpdated' to 'codeUpdate'
                fileId: currentFile.id,
                content: editor.getValue(),
                revision: currentRevision++
            }));
        }
    }, 500));

    // Initialize
    fetchRepositoryName().then(loadFileTree);

    // Add this in your DOMContentLoaded event handler
    const exitButton = document.getElementById('exitButton');
    exitButton.addEventListener('click', () => {
        // Redirect to the repositories page
        window.location.href = 'repository.html';
    });
});
