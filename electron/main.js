const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
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

function getBackendExecutable() {
  const platform = process.platform;
  const isPackaged = app.isPackaged;
  
  if (isPackaged) {
    // In packaged app, the backend executable is in resources/backend
    const resourcesPath = path.join(process.resourcesPath, 'backend');
    if (platform === 'win32') {
      return path.join(resourcesPath, 'visualize-backend.exe');
    } else {
      return path.join(resourcesPath, 'visualize-backend');
    }
  } else {
    // In development, use the venv Python
    if (platform === 'win32') {
      return '"' + path.join(__dirname, '..', 'backend', 'venv', 'Scripts', 'python.exe') + '"';
    } else {
      return path.join(__dirname, '..', 'backend', 'venv', 'bin', 'python');
    }
  }
}

function getBackendWorkingDir() {
  const isPackaged = app.isPackaged;
  if (isPackaged) {
    return path.join(process.resourcesPath, 'backend');
  } else {
    return path.join(__dirname, '..', 'backend');
  }
}

async function startBackend() {
  console.log('Starting backend server...');
  const platform = process.platform;
  const isPackaged = app.isPackaged;
  const backendExe = getBackendExecutable();
  const workingDir = getBackendWorkingDir();
  
  // Set VISUALIZE_ROOT so backend can find .env file
  const env = { ...process.env };
  if (isPackaged) {
    env.VISUALIZE_ROOT = process.resourcesPath;
  } else {
    env.VISUALIZE_ROOT = path.join(__dirname, '..');
  }

  if (isPackaged) {
    // In packaged app, run the PyInstaller-built executable
    console.log(`Starting packaged backend: ${backendExe}`);
    backendProcess = spawn(backendExe, [], {
      cwd: workingDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      env: env
    });
  } else {
    // In development, use venv python -m uvicorn
    const pythonCmd = getBackendExecutable();
    console.log(`Starting development backend with: ${pythonCmd}`);
    
    if (platform === 'win32') {
      const command = `${pythonCmd} -m uvicorn app.main:app --port 3000`;
      backendProcess = exec(command, { cwd: workingDir, env: env });
    } else {
      backendProcess = spawn(pythonCmd, ['-m', 'uvicorn', 'app.main:app', '--port', '3000'], {
        cwd: workingDir,
        shell: true,
        env: env
      });
    }
  }

  backendProcess.stdout?.on('data', (data) => {
    console.log(`Backend stdout: ${data}`);
  });

  backendProcess.stderr?.on('data', (data) => {
    console.error(`Backend stderr: ${data}`);
  });

  backendProcess.on('error', (err) => {
    console.error(`Backend process error: ${err}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
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