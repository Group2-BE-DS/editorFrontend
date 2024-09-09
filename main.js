const { spawn } = require('child_process');
const { app, BrowserWindow } = require('electron'); // Import necessary modules

function startDjangoServer() {
  const djangoBackend = spawn('E:\\sem7\\Major-proj\\waumeditor\\backend\\env\\Scripts\\python.exe', [
    'E:\\sem7\\Major-proj\\waumeditor\\backend\\editorBackend\\manage.py',
    'runserver',
    '--noreload',
  ]);

  djangoBackend.stdout.on('data', (data) => {
    console.log(`stdout:\n${data}`);
  });

  djangoBackend.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  djangoBackend.on('error', (error) => {
    console.error(`error: ${error.message}`);
  });

  djangoBackend.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
  });
}

function createWindow() {
  startDjangoServer();

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
  });

  // Load your desired URL (replace 'index.html' with your actual entry point)
  mainWindow.loadFile('index.html');

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
}

// When Electron is ready, create the window
app.whenReady().then(createWindow);

// Quit when all windows are closed (unless on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// On macOS, re-create the window when the app is activated
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
