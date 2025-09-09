'use strict';

// import { logger } from '../../logger';

declare global {
  interface Window {
    i18nTrans: (domain: string, message: string, ...args: unknown[]) => string;
  }
}

export function validateProject(): boolean {
  const projectName = document.getElementById('projectName') as HTMLInputElement;
  const error = document.getElementById('projectNameError') as HTMLElement;

  if (projectName.value.trim() === '') {
    projectName.classList.add('invalid');
    error.style.display = 'block';
    return false;
  } else {
    projectName.classList.remove('invalid');
    error.style.display = 'none';
    return true;
  }
}

export function validateProjectFolder(): boolean {
  const projectFolder = document.getElementById('projectFolder') as HTMLInputElement;
  const error = document.getElementById('projectFolderError') as HTMLElement;
  const folderPath = projectFolder.value.trim();

  if (folderPath === '' || folderPath.includes('OneDrive')) {
    projectFolder.classList.add('invalid');
    if (error) {
      error.style.display = 'block';
      error.innerText = folderPath.includes('OneDrive')
        ? window.i18nTrans('ui', "Invalid Base Folder - Folder can't be in OneDrive")
        : window.i18nTrans('ui', 'Invalid Base Folder');
    }
    return false;
  } else {
    projectFolder.classList.remove('invalid');
    if (error) {
      error.style.display = 'none';
    }
    return true;
  }
}

export function validateXrpRomi(): boolean {
  const romiDiv = document.getElementById('romidiv') as HTMLDivElement;
  const xrpDiv = document.getElementById('xrpdiv') as HTMLDivElement;

  if (romiDiv) {
    romiDiv.classList.remove('error');
  }
  if (xrpDiv) {
    xrpDiv.classList.remove('error');
  }

  return true;
}

export function validateTeamNumber(): boolean {
  const teamNumber = document.getElementById('teamNumber') as HTMLInputElement;
  const error = document.getElementById('teamNumberError') as HTMLElement;

  if (teamNumber.value.trim() === '') {
    // Empty is valid (optional)
    teamNumber.classList.remove('invalid');
    if (error) {
      error.style.display = 'none';
    }
    return true;
  }

  const num = Number.parseInt(teamNumber.value, 10);
  if (
    Number.isNaN(num) ||
    teamNumber.value.includes('.') ||
    teamNumber.value.includes('e') ||
    num < 1 ||
    num > 25599
  ) {
    teamNumber.classList.add('invalid');
    if (error) {
      error.style.display = 'block';
    }
    return false;
  } else {
    teamNumber.classList.remove('invalid');
    if (error) {
      error.style.display = 'none';
    }
    return true;
  }
}
