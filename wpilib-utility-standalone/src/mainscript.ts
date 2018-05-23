
import * as electron from 'electron';
const remote = electron.remote;

window.addEventListener('load', () => {
  const mainDiv = document.getElementById('mainDiv');
  if (mainDiv === null) {
    return;
  }
  mainDiv.appendChild(document.createTextNode('WPILib Utility'));
  const rioLogButton = document.createElement('button');
  rioLogButton.appendChild(document.createTextNode('Start RioLog'));
  rioLogButton.addEventListener('click', () => {
    const bWindow = remote.getCurrentWindow();

    bWindow.setSize(800, 600);
    bWindow.setTitle('RioLog');

    bWindow.loadFile('riolog.html');

    return;
  });
  mainDiv.appendChild(rioLogButton);

  const generatorButton = document.createElement('button');
  generatorButton.appendChild(document.createTextNode('Start Generator'));
  generatorButton.addEventListener('click', () => {
    const bWindow = remote.getCurrentWindow();

    bWindow.setSize(800, 600);
    bWindow.setTitle('Generator');

    bWindow.loadFile('generator.html');
  });
  mainDiv.appendChild(generatorButton);
});
