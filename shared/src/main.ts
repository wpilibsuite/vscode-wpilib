import * as fs from 'fs';
import * as path from 'path';

let copyToProjects = ['vscode-wpilib-core', 'vscode-wpilib-cpp', 'vscode-wpilib-java', 'vscode-wpilib-outlineviewer'];

const copyFromFolder = 'toCopy';

console.log('Start of VSCode Shared Copy');

let filesToCopy = fs.readdirSync(copyFromFolder);

let rootDir = path.dirname(process.cwd());

console.log(rootDir);

for (let f of copyToProjects) {
  let p = path.join(rootDir, f, 'src', 'shared');
  try {
    fs.mkdirSync(p);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }
  for (let f of filesToCopy) {
    let copyFile = path.join(process.cwd(), copyFromFolder, f);
    let toFile = path.join(p, f);
    console.log(toFile);
    fs.copyFileSync(copyFile, path.join(p, f));
    //console.log(copyFile);
  }
}





//fs.files
