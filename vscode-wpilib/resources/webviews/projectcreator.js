'use strict';

const vscode = acquireVsCodeApi();

let template = false;
let language = '';
let base = '';

function selectProjectType() {
  document.activeElement.blur();
  vscode.postMessage({type: 'projecttype'})
}

function selectLanguage() {
  document.activeElement.blur();
  vscode.postMessage({
    type: 'language',
    data: {
      template,
      language
    },
  })
}

function selectProjectBase() {
  document.activeElement.blur();
  vscode.postMessage({
      type: 'base',
      data: {
        template,
        language
      }
    })
}

function selectProjectFolder() {
  document.activeElement.blur();
  vscode.postMessage({type: 'newproject'});
}

function generateProject() {
  document.activeElement.blur();
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
      const pdiv = document.getElementById('packagediv');
      if (language === 'java') {
        pdiv.style.visibility = 'visible';
      } else {
        pdiv.style.visibility = 'hidden';
      }
      break;
    case 'base':
      base = data.data
      baseButton.innerText = base
      break;
  }
});

function validateProject() {
  const elem = document.getElementById('projectName');
  const s = elem.value
  const match = s.match(/\w[\w-]*$/gm);
  const pdiv = document.getElementById('projectnamediv');
  if (match === null || match.length === 0) {
    pdiv.innerText = 'Invalid Project Name';

    pdiv.classList.add('error');
    elem.classList.add('error');
  } else {
    pdiv.innerText = 'Enter a project name';
    pdiv.classList.remove('error');
    elem.classList.remove('error');
  }
}