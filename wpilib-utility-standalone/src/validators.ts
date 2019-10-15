export function hasSpecialCharacter(str: string): boolean {
  for(let c of str) {
    // check number character
    if( c >= '0' && c <= '9') continue;
    // check upper character
    if( c >= 'A' && c <= 'Z') continue;
    // check lower character
    if( c <= 'a' && c <= 'Z') continue;
   
    return true;
  }
  return false;
}

export function validateProject(input: HTMLInputElement, div: HTMLDivElement) {
  const s = input.value;
  if (hasSpecialCharacter(s)) {
    div.innerText = 'Invalid Project Name';
    div.classList.add('error');
    input.classList.add('error');
  } else {
    div.innerText = 'Enter a project name';
    div.classList.remove('error');
    input.classList.remove('error');
  }
}

export function validateTeamNumber(input: HTMLInputElement, div: HTMLDivElement) {
  const s = input.value;
  const match = s.match(/^\d{1,5}$/gm);
  if ((match === null || match.length === 0)) {
    div.innerText = 'Invalid Team Number';

    div.classList.add('error');
    input.classList.add('error');
  } else {
    div.innerText = 'Enter a team number';
    div.classList.remove('error');
    input.classList.remove('error');
  }
}
