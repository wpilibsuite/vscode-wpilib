'use strict';

declare global {
    // tslint:disable-next-line:interface-name no-any
    interface Window { i18nTrans: (domain: string, message: string, ...args: any[]) => string; }
}

export function hasSpecialCharacter(str: string): boolean {
  const characterBlacklist = ['@', '!', '.', '/', '\\', '$', '&', '|', '`', '~', ':', ' '];
  // check black list characters
  for (const c of str) {
    if (characterBlacklist.indexOf(c) !== -1) {
      return true;
    }
  }
  // check prefix and suffix
  for (const c of (str[0] + str[str.length - 1])) {
    if (c >= '0' && c <= '9') {
      continue;
    }
    if (c >= 'A' && c <= 'Z') {
      continue;
    }
    if (c >= 'a' && c <= 'z') {
      continue;
    }
    return true;
  }
  return false;
}

export function validatePath(str: string): boolean {
  const characterBlacklist = ['@', '!', '.', '$', '&', '|', '`'];
  for (const c of str) {
    if(characterBlacklist.indexOf(c) !== -1) {
      return false;
    }
  } 
  return true;
}

export function validateProject() {
  const elem = document.getElementById('projectName') as HTMLButtonElement;
  const s = elem.value;
  const pdiv = document.getElementById('projectnamediv') as HTMLDivElement;
  if ( hasSpecialCharacter(s)) {
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

export function validateProjectFolder() {
  const input = document.getElementById('projectFolder') as HTMLInputElement;
  const div = document.getElementById('projectFolderdiv') as HTMLInputElement;
  const s = input.value;
  if (!validatePath(s)) {
    div.innerText = 'Select a folder to place the new project into. path includes illegal character(s)';
    div.classList.add('error');
    input.classList.add('error');
  } else {
    div.innerText = 'Select a folder to place the new project into.';
    div.classList.remove('error');
    input.classList.remove('error');
  }
}