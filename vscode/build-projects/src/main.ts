import * as fs from 'fs';
import * as path from 'path';
import * as npm from 'npm';
import * as vsce from 'vsce';
import { exec } from './execution';

function promisityReaddir(dir: string): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    fs.readdir(dir, (err, dirs) => {
      if (err) {
        reject(err);
      } else {
        resolve(dirs);
      }
    })
  })
}

async function getProjectDirectories(): Promise<string[]> {
  const ignoreDirectories = ['build-projects', 'vscode-wpilib-outlineviewer'];
  const searchPath = path.join(process.cwd(), '..');
  console.log(searchPath);
  let items = await promisityReaddir(searchPath);
  items = items.filter((v, _i, _a) => {
    for (const ig of ignoreDirectories) {
      if (v.indexOf(ig) >= 0) {
        return false;
      }
    }
    const tmpPath = path.join(searchPath, v, 'package.json');
    if (!fs.existsSync(tmpPath)) {
      return false;
    }
    return true;
  });
  return items;
}

async function main(): Promise<void> {
  const projectDirectories = await getProjectDirectories();
  const searchPath = path.join(process.cwd(), '..');
  const fullProjectDirectories = [];
  let promiseArray: Promise<{ stdout: string; stderr: string; }>[] = [];
  for (const p of projectDirectories) {
    const fullP = path.join(searchPath, p);
    fullProjectDirectories.push(fullP);
    promiseArray.push(exec('npm install', {
      cwd: fullP
    }));
  }
  try {
    const finishedPromises = await Promise.all(promiseArray);
  } catch (err) {
    console.log(err);
    return;
  }


  promiseArray = [];
  for (const p of fullProjectDirectories) {
    promiseArray.push(exec('npm run package', {
      cwd: p
    }));
  }

  try {
    const finishedPromises = await Promise.all(promiseArray);
  } catch (err) {
    console.log(err);
    return;
  }
}

main().then(() => {
  console.log('finished');
}).catch((err) => {
  console.log(err);
})

