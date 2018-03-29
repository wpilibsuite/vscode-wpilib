
import * as path from 'path';
import * as url from 'url';
const { BrowserWindow } = require('electron').remote;
const remote = require('electron').remote;

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
    rioLogWindow = new BrowserWindow({
      parent: remote.getCurrentWindow(),
      modal: true,
      height: 600,
      width: 800,
      backgroundColor: '#2e2c29',
      title: 'RioLog'
    });

    rioLogWindow.loadURL(url.format({
      pathname: path.join(__dirname, '../riolog.html'),
      protocol: 'file:',
      slashes: true,
    }));

    rioLogWindow.setMenu(null);

    rioLogWindow.on('closed', () => {
      rioLogWindow = undefined;
    });
  });
  mainDiv.appendChild(rioLogButton);

  const generatorButton = document.createElement('button');
  generatorButton.appendChild(document.createTextNode('Start Generator'));
  generatorButton.addEventListener('click', () => {
    if (generatorWindow !== undefined) {
      return;
    }
    generatorWindow = new BrowserWindow({
      parent: remote.getCurrentWindow(),
      modal: true,
      height: 600,
      width: 800,
      backgroundColor: '#2e2c29',
      title: 'Generator'
    });

    generatorWindow.loadURL(url.format({
      pathname: path.join(__dirname, '../generator.html'),
      protocol: 'file:',
      slashes: true,
    }));

    generatorWindow.setMenu(null);

    generatorWindow.on('closed', () => {
      generatorWindow = undefined;
    });
  });
  mainDiv.appendChild(generatorButton);
});
