'use strict';

declare global {
    // tslint:disable-next-line:interface-name no-any
    interface Window { i18nTrans: (domain: string, message: string, ...args: any[]) => string; }
}

export function validateProject() {
  const elem = document.getElementById('projectName') as HTMLButtonElement;
  const s = elem.value;
  const match = s.match(/\w[\w-]*$/gm);
  const pdiv = document.getElementById('projectnamediv') as HTMLDivElement;
  if (match === null || match.length === 0) {
    pdiv.innerText = window.i18nTrans('ui', 'Invalid project name');
    pdiv.classList.add('error');
    elem.classList.add('error');
  } else {
    pdiv.innerText = window.i18nTrans('ui', 'Enter a project name');
    pdiv.classList.remove('error');
    elem.classList.remove('error');
  }
}

export function validateTeamNumber() {
  const elem = document.getElementById('teamNumber') as HTMLInputElement;
  const s = elem.value;
  const match = s.match(/^\d{1,5}$/gm);
  const pdiv = document.getElementById('teamnumberdiv') as HTMLDivElement;
  if ((match === null || match.length === 0)) {
    pdiv.innerText = window.i18nTrans('ui', 'Invalid team number');
    pdiv.classList.add('error');
    elem.classList.add('error');
  } else {
    pdiv.innerText = window.i18nTrans('ui', 'Enter a team number');
    pdiv.classList.remove('error');
    elem.classList.remove('error');
  }
}
