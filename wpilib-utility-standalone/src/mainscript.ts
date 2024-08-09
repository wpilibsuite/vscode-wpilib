import { getCurrentWindow } from '@electron/remote';

document.addEventListener('keydown', (e) => {
  if (e.key === '{') {
    getCurrentWindow().webContents.openDevTools();
  } else if (e.key === '}') {
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
  rioLogButton.addEventListener('click', async () => {
    const bWindow = getCurrentWindow();

    bWindow.setSize(800, 600);
    bWindow.setTitle('RioLog');

    await bWindow.loadFile('riolog.html');

    return;
  });
  rioLogButton.style.marginTop = '5px';
  mainDiv.appendChild(rioLogButton);
  mainDiv.appendChild(document.createElement('br'));

  const generatorButton = document.createElement('button');
  generatorButton.appendChild(document.createTextNode('Start New Project Generator'));
  generatorButton.addEventListener('click', async () => {
    const bWindow = getCurrentWindow();

    bWindow.setSize(800, 600);
    bWindow.setTitle('New Project Generator');

    await bWindow.loadFile('projectcreator.html');
  });
  generatorButton.style.marginTop = '5px';
  mainDiv.appendChild(generatorButton);
  mainDiv.appendChild(document.createElement('br'));

  const vendorDepsButton = document.createElement('button');
  vendorDepsButton.appendChild(document.createTextNode('Start Vendor Deps Manager'));
  vendorDepsButton.addEventListener('click', async () => {
    const bWindow = getCurrentWindow();

    bWindow.setSize(800, 600);
    bWindow.setTitle('Vendor Deps Manager');

    await bWindow.loadFile('vendordeps.html');
  });
  vendorDepsButton.style.marginTop = '5px';
  mainDiv.appendChild(vendorDepsButton);
  mainDiv.appendChild(document.createElement('br'));

  return;
});
