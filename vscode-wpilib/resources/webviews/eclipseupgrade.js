'use strict';

const vscode = acquireVsCodeApi();

function eclipseSelectButtonClick() {
  vscode.postMessage({type: 'eclipse'});
}

function projectSelectButtonClick() {
  vscode.postMessage({type: 'newproject'});
}

function upgradeProjectButtonClick() {
  vscode.postMessage({
    type: 'upgradeproject',
    data: {
      fromProps: document.getElementById('eclipseInput').value,
      toFolder: document.getElementById('projectFolder').value,
      projectName: document.getElementById('projectName').value,
      newFolder: document.getElementById('newFolderCB').checked,
    }
  })
}

window.addEventListener('message', (event) => {
  const data = event.data;
  switch(data.type) {
    case 'eclipse':
      document.getElementById('eclipseInput').value = data.data;
      break;
    case 'projectname':
      const doc = document.getElementById('projectName');
      doc.value = data.data;
      doc.disabled = false;
      break;
    case 'newproject':
      const elem = document.getElementById('projectFolder');
      elem.value = data.data;
      break;
  }
});