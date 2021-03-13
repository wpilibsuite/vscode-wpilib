export function validateProject(input: HTMLInputElement, div: HTMLDivElement): boolean {
  const s = input.value;
  const match = s.match(/\w[\w-]*$/gm);
  if (match === null || match.length === 0) {
    div.innerText = 'Invalid Project Name';
    div.classList.add('error');
    input.classList.add('error');
    return false;
  } else {
    div.innerText = 'Enter a project name';
    div.classList.remove('error');
    input.classList.remove('error');
    return true;
  }
}

export function validateTeamNumber(input: HTMLInputElement, div: HTMLDivElement): boolean {
  const s = input.value;
  const match = s.match(/^\d{1,5}$/gm);
  if ((match === null || match.length === 0)) {
    div.innerText = 'Invalid Team Number';

    div.classList.add('error');
    input.classList.add('error');
    return false;
  } else {
    div.innerText = 'Enter a team number';
    div.classList.remove('error');
    input.classList.remove('error');
    return true;
  }
}
