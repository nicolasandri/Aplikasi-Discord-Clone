const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

// Set app name
app.setName('WorkGrid');
app.setAppUserModelId('com.workgrid.app');

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;

const createWindow = () => {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    frame: false, // Remove default frame for custom title bar
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, '../public/workgrid_app_icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow cross-origin requests in production
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // Load the app
  // In production, load the built files
  // In development, load the dev server
  const isDev = !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    // Optional: Open DevTools in production for debugging
    // mainWindow.webContents.openDevTools();
  }

  // Disable default context menu to allow custom context menu from React
  mainWindow.webContents.on('context-menu', (e) => {
    e.preventDefault();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// App event handlers
app.whenReady().then(() => {
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

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('close-window', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('is-focused', () => {
  return mainWindow ? mainWindow.isFocused() : false;
});
