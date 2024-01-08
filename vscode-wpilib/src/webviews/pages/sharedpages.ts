'use strict';

// import { logger } from '../../logger';

declare global {
    interface Window { i18nTrans: (domain: string, message: string, ...args: unknown[]) => string; }
}

export function validateProject(): boolean {
  const elem = document.getElementById('projectName') as HTMLButtonElement;
  const s = elem.value;
  // logger.log('Project Name: ' + s);
  const match = s.match(/\w[\w-]*$/gm);
  const pdiv = document.getElementById('projectnamediv') as HTMLDivElement;
  if (match === null || match.length === 0) {
    pdiv.innerText = window.i18nTrans('ui', 'Invalid project name');
    pdiv.classList.add('error');
    elem.classList.add('error');
    return false;
  } else {
    pdiv.innerText = window.i18nTrans('ui', 'Project Name');
    pdiv.classList.remove('error');
    elem.classList.remove('error');
    return true;
  }
}

export function validateProjectFolder(): boolean {
  const elem = document.getElementById('projectFolder') as HTMLInputElement;
  const s = elem.value;
  // logger.log('Validate Project Folder: ' + s);
  const oneDrive = s.includes('OneDrive');
  const pdiv = document.getElementById('projectfolderdiv') as HTMLDivElement;
  if (oneDrive === true || s.length === 0) {
    pdiv.innerText = oneDrive === true ? window.i18nTrans('ui', 'Invalid Base Folder - Folder can\'t be in OneDrive') : window.i18nTrans('ui', 'Invalid Base Folder');
    pdiv.classList.add('error');
    elem.classList.add('error');
    return false;
  } else {
    pdiv.innerText = window.i18nTrans('ui', 'Base Folder');
    pdiv.classList.remove('error');
    elem.classList.remove('error');
    return true;
  }
}

export function validateTeamNumber(): boolean {
  const elem = document.getElementById('teamNumber') as HTMLInputElement;
  const s = elem.value;
  const match = s.match(/^\d{1,5}$/gm);
  const pdiv = document.getElementById('teamnumberdiv') as HTMLDivElement;
  if ((match === null || match.length === 0)) {
    pdiv.innerText = window.i18nTrans('ui', 'Invalid team number');
    pdiv.classList.add('error');
    elem.classList.add('error');
    return false;
  } else {
    pdiv.innerText = window.i18nTrans('ui', 'Team Number');
    pdiv.classList.remove('error');
    elem.classList.remove('error');
    return true;
  }
}
