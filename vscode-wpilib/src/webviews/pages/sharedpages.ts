'use strict';

export function validateProject() {
  const elem = document.getElementById('projectName') as HTMLButtonElement;
  const s = elem.value;
  const match = s.match(/\w[\w-]*$/gm);
  const pdiv = document.getElementById('projectnamediv') as HTMLDivElement;
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

export function validateTeamNumber() {
  const elem = document.getElementById('teamNumber') as HTMLInputElement;
  const s = elem.value;
  const match = s.match(/^\d{1,5}$/gm);
  const pdiv = document.getElementById('teamnumberdiv') as HTMLDivElement;
  if ((match === null || match.length === 0)) {
    pdiv.innerText = 'Invalid Team Number';
    pdiv.classList.add('error');
    elem.classList.add('error');
  } else {
    pdiv.innerText = 'Enter a team number';
    pdiv.classList.remove('error');
    elem.classList.remove('error');
  }
}
