const { app, BrowserWindow, screen } = require('electron');
const path = require('node:path');
const { spawn } = require('child_process');

function startDjangoServer() {
  // Define the command to activate the virtual environment and run the Django server
  const djangoBackend = spawn('cmd.exe', [
    '/c', // Use /c to run the command and then terminate
    'E:\\MJ\\editorBackend\\editorBackend\\env\\Scripts\\activate && python E:\\MJ\\editorBackend\\manage.py runserver --noreload'
  ], {
    shell: true, // Use shell to allow command chaining
  });

  djangoBackend.stdout.on('data', (data) => {
    console.log(`Django server stdout:\n${data}`);
  });

  djangoBackend.stderr.on('data', (data) => {
    console.error(`Django server stderr: ${data}`);
  });

  djangoBackend.on('error', (error) => {
    console.error(`Django server error: ${error.message}`);
  });

  djangoBackend.on('close', (code) => {
    console.log(`Django server child process exited with code ${code}`);
  });
}

if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const mainWindow = new BrowserWindow({
    width: Math.min(width, 800),
    height: Math.min(height, 600),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.webContents.openDevTools();
};

app.whenReady().then(() => {
  startDjangoServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});