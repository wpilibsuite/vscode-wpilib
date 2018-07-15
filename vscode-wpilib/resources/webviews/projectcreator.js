'use strict';

const vscode = acquireVsCodeApi();

let template = false;
let language = '';
let base = '';

function selectProjectType() {
  vscode.postMessage({type: 'projecttype'})
}

function selectLanguage() {
  vscode.postMessage({
    type: 'language',
    data: {
      template,
      language
    },
  })
}

function selectProjectBase() {
  vscode.postMessage({
      type: 'base',
      data: {
        template,
        language
      }
    })
}

function selectProjectFolder() {
  vscode.postMessage({type: 'newproject'});
}

function generateProject() {
  console.log(language + ' lang');
  console.log(base + ' base');
  vscode.postMessage({
    type: 'createproject',
    data: {
      template,
      language,
      base,
      toFolder: document.getElementById('projectFolder').value,
      projectName: document.getElementById('projectName').value,
      newFolder: document.getElementById('newFolderCB').checked,
    }
  });
}

window.addEventListener('message', (event) => {
  const data = event.data;
  console.log(data);
  const pType = document.getElementById('projectType');
  const lang = document.getElementById('language');
  const baseButton = document.getElementById('projectBase');
  switch(data.type) {
    case 'newproject':
      const elem = document.getElementById('projectFolder');
      elem.value = data.data;
      break;
    case 'projecttype':
      template = data.data;
      pType.innerText = template ? 'template' : 'example';
      lang.disabled = false;
      lang.innerText = 'Select a language'
      baseButton.disabled = true;
      baseButton.innerText = 'Select a project base'
      break;
    case 'language':
      language = data.data;
      lang.innerText = language;
      baseButton.disabled = false;
      baseButton.innerText = 'Select a project base'
      break;
    case 'base':
      base = data.data
      baseButton.innerText = base
      break;
  }
});