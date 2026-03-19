const { app, BrowserWindow, ipcMain, dialog, Notification } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Set app name
app.setName('WorkGrid');
app.setAppUserModelId('com.workgrid.app');

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;
let updateInfo = null;

// Auto-updater configuration
autoUpdater.autoDownload = false; // Manual download untuk kontrol lebih
autoUpdater.allowPrerelease = false;

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
  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Disable default context menu
  mainWindow.webContents.on('context-menu', (e) => {
    e.preventDefault();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Check for updates when window is ready (only in production)
  // Disabled: Auto-update URL not configured yet
  // if (!isDev) {
  //   mainWindow.webContents.on('did-finish-load', () => {
  //     checkForUpdates();
  //   });
  // }
};

// Auto-update functions
function checkForUpdates() {
  console.log('[AutoUpdate] Checking for updates...');
  autoUpdater.checkForUpdates().catch(err => {
    console.log('[AutoUpdate] Check failed:', err.message);
  });
}

function sendStatusToWindow(status, data = {}) {
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { status, ...data });
  }
}

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  console.log('[AutoUpdate] Checking for update...');
  sendStatusToWindow('checking');
});

autoUpdater.on('update-available', (info) => {
  console.log('[AutoUpdate] Update available:', info.version);
  updateInfo = info;
  sendStatusToWindow('available', { 
    version: info.version, 
    releaseDate: info.releaseDate,
    releaseNotes: info.releaseNotes 
  });
});

autoUpdater.on('update-not-available', (info) => {
  console.log('[AutoUpdate] No update available');
  updateInfo = null;
  sendStatusToWindow('not-available', { version: info.version });
});

autoUpdater.on('error', (err) => {
  console.log('[AutoUpdate] Error:', err.message);
  sendStatusToWindow('error', { message: err.message });
});

autoUpdater.on('download-progress', (progressObj) => {
  const percent = Math.round(progressObj.percent);
  console.log(`[AutoUpdate] Download progress: ${percent}%`);
  sendStatusToWindow('downloading', { 
    percent,
    transferred: progressObj.transferred,
    total: progressObj.total
  });
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('[AutoUpdate] Update downloaded');
  sendStatusToWindow('downloaded', { version: info.version });
  
  // Tanya user apakah mau install sekarang
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Siap Diinstall',
    message: `WorkGrid versi ${info.version} telah diunduh. Install sekarang?`,
    buttons: ['Install Sekarang', 'Nanti'],
    defaultId: 0
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

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
  return {
    version: app.getVersion(),
    isPackaged: app.isPackaged
  };
});

ipcMain.handle('check-for-updates', async () => {
  if (!app.isPackaged) {
    return { success: false, message: 'Update hanya tersedia di aplikasi terinstall' };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result?.updateInfo || null };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('download-update', async () => {
  if (!app.isPackaged) {
    return { success: false, message: 'Update hanya tersedia di aplikasi terinstall' };
  }
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});

// Window controls
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

// Show native notification from main process
ipcMain.handle('show-notification', (event, { title, body, icon }) => {
  if (!mainWindow || !mainWindow.isFocused()) {
    const notification = new Notification({
      title: title || 'WorkGrid',
      body: body || '',
      icon: icon || path.join(__dirname, '../public/workgrid_app_icon.png'),
      silent: false,
    });
    
    notification.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });
    
    notification.show();
    return true;
  }
  return false;
});

// Focus the main window
ipcMain.handle('focus-window', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    mainWindow.show();
  }
});
