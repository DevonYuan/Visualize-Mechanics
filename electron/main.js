const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let backendProcess;

function checkBackendReady(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/v1/health`, () => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function getPythonCommand() {
  // Try to find the correct python/uvicorn path
  const platform = process.platform;
  if (platform === 'win32') {
    return '"' + path.join(__dirname, '..', 'backend', 'venv', 'Scripts', 'python.exe') + '"';
  } else {
    return path.join(__dirname, '..', 'backend', 'venv', 'bin', 'python');
  }
}

async function startBackend() {
  console.log('Starting backend server...');

  const pythonCmd = getPythonCommand();

  // Start the FastAPI backend using the venv python -m uvicorn
  // Use exec for Windows to handle spaces in path
  const platform = process.platform;
  let backendProcess;

  if (platform === 'win32') {
    const { exec } = require('child_process');
    const backendDir = '"' + path.join(__dirname, '..', 'backend') + '"';
    const command = `${pythonCmd} -m uvicorn app.main:app --port 3000`;
    backendProcess = exec(command, { cwd: path.join(__dirname, '..', 'backend') });
  } else {
    const { spawn } = require('child_process');
    backendProcess = spawn(pythonCmd, ['-m', 'uvicorn', 'app.main:app', '--port', '3000'], {
      cwd: path.join(__dirname, '..', 'backend'),
      shell: true
    });
  }

  backendProcess.stdout?.on('data', (data) => {
    console.log(`Backend stdout: ${data}`);
  });

  backendProcess.stderr?.on('data', (data) => {
    console.error(`Backend stderr: ${data}`);
  });

  // Wait for backend to be ready
  console.log('Waiting for backend to start...');
  let ready = false;
  for (let i = 0; i < 30; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    ready = await checkBackendReady(3000);
    if (ready) {
      console.log('Backend is ready!');
      break;
    }
  }

  if (!ready) {
    console.error('Backend failed to start');
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  await startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});