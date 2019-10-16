export function hasSpecialCharacter(str: string): boolean {
  const characterBlacklist = ['@', '!', '.', '$', '&', '|', '`', ':'];
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

export function validateProjectFolder(input: HTMLInputElement, div: HTMLDivElement) {
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
