import { app, BrowserWindow } from 'electron';
// import * as path from 'path';
// import * as url from 'url';
import { initialize, enable } from '@electron/remote/main';
initialize();

let mainWindow: Electron.BrowserWindow | undefined;

async function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    backgroundColor: '#2e2c29',
    height: 250,
    title: 'WPILib Utility',
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
    },
    width: 350,
  });
  enable(mainWindow.webContents);

  await mainWindow.loadFile('index.html');

  mainWindow.setMenu(null);

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  // mainWindow.webContents.send('messageFromMain', 'hello');

  // console.log('logging');

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = undefined;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  // On OS X it"s common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    await createWindow();
  }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
