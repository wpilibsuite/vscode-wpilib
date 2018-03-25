import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import * as url from 'url';
import { RioLogWindow } from './riolog/shared/riologwindow';
import { RioLogWebviewProvider, LiveRioConsoleProvider } from './riolog/electronimpl';

let mainWindow: Electron.BrowserWindow | undefined;

let rioLog: RioLogWindow | undefined;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    backgroundColor: '#2e2c29',
    title: 'RioLog'
  });

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
      pathname: path.join(__dirname, '../index.html'),
      protocol: 'file:',
      slashes: true,
  }));

  mainWindow.setMenu(null);

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();

  //mainWindow.webContents.send('messageFromMain', 'hello');

  //console.log('logging');

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    if (rioLog !== undefined) {
      rioLog.dispose();
      rioLog = undefined;
    }
    mainWindow = undefined;
  });

  rioLog = new RioLogWindow(new RioLogWebviewProvider(mainWindow), new LiveRioConsoleProvider());

  rioLog.start(9999);
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

app.on('activate', () => {
  // On OS X it"s common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
