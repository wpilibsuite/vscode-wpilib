
import * as electron from 'electron';
const remote = electron.remote;

document.addEventListener('keydown', (e) => {
  if (e.which === 123) {
    remote.getCurrentWindow().webContents.openDevTools();
  } else if (e.which === 116) {
    location.reload();
  }
});

window.addEventListener('load', () => {
  const mainDiv = document.getElementById('mainDiv');
  if (mainDiv === null) {
    return;
  }
  mainDiv.appendChild(document.createTextNode('WPILib Utility'));
  mainDiv.appendChild(document.createElement('br'));
  const rioLogButton = document.createElement('button');
  rioLogButton.appendChild(document.createTextNode('Start RioLog'));
  rioLogButton.addEventListener('click', () => {
    const bWindow = remote.getCurrentWindow();

    bWindow.setSize(800, 600);
    bWindow.setTitle('RioLog');

    bWindow.loadFile('riolog.html');

    return;
  });
  rioLogButton.style.marginTop = '5px';
  mainDiv.appendChild(rioLogButton);
  mainDiv.appendChild(document.createElement('br'));

  const generatorButton = document.createElement('button');
  generatorButton.appendChild(document.createTextNode('Start New Project Generator'));
  generatorButton.addEventListener('click', () => {
    const bWindow = remote.getCurrentWindow();

    bWindow.setSize(800, 600);
    bWindow.setTitle('New Project Generator');

    bWindow.loadFile('projectcreator.html');
  });
  generatorButton.style.marginTop = '5px';
  mainDiv.appendChild(generatorButton);
  mainDiv.appendChild(document.createElement('br'));

  const eclipseButton = document.createElement('button');
  eclipseButton.appendChild(document.createTextNode('Start Eclipse Importer'));
  eclipseButton.addEventListener('click', () => {
    const bWindow = remote.getCurrentWindow();

    bWindow.setSize(800, 600);
    bWindow.setTitle('Eclipse Importer');

    bWindow.loadFile('eclipseimport.html');
  });
  eclipseButton.style.marginTop = '5px';
  mainDiv.appendChild(eclipseButton);
});
