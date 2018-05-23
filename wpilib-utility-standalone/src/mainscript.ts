
import * as electron from 'electron';
import * as path from 'path';
import * as url from 'url';
const remote = electron.remote;

let rioLogWindow: Electron.BrowserWindow | undefined;
let generatorWindow: Electron.BrowserWindow | undefined;

window.addEventListener('load', () => {
  const mainDiv = document.getElementById('mainDiv');
  if (mainDiv === null) {
    return;
  }
  mainDiv.appendChild(document.createTextNode('WPILib Utility'));
  const rioLogButton = document.createElement('button');
  rioLogButton.appendChild(document.createTextNode('Start RioLog'));
  rioLogButton.addEventListener('click', () => {
    if (rioLogWindow !== undefined) {
      return;
    }
    rioLogWindow = new remote.BrowserWindow({
      backgroundColor: '#2e2c29',
      height: 600,
      modal: true,
      parent: remote.getCurrentWindow(),
      title: 'RioLog',
      width: 800,
    });

    rioLogWindow.loadURL(url.format({
      pathname: path.join(__dirname, '../riolog.html'),
      protocol: 'file:',
      slashes: true,
    }));

    rioLogWindow.setMenu(null);

    remote.getCurrentWindow().hide();

    rioLogWindow.on('closed', () => {
      rioLogWindow = undefined;
      remote.getCurrentWindow().close();
    });
  });
  mainDiv.appendChild(rioLogButton);

  const generatorButton = document.createElement('button');
  generatorButton.appendChild(document.createTextNode('Start Generator'));
  generatorButton.addEventListener('click', () => {
    if (generatorWindow !== undefined) {
      return;
    }
    generatorWindow = new remote.BrowserWindow({
      backgroundColor: '#2e2c29',
      height: 600,
      modal: true,
      parent: remote.getCurrentWindow(),
      title: 'Generator',
      width: 800,
    });

    generatorWindow.loadURL(url.format({
      pathname: path.join(__dirname, '../generator.html'),
      protocol: 'file:',
      slashes: true,
    }));

    generatorWindow.setMenu(null);

    remote.getCurrentWindow().hide();

    generatorWindow.on('closed', () => {
      generatorWindow = undefined;
      remote.getCurrentWindow().close();
    });
  });
  mainDiv.appendChild(generatorButton);
});
