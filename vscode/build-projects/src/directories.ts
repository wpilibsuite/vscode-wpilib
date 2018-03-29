import * as fs from 'fs';
import * as path from 'path';

function promisityReaddir(dir: string): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    fs.readdir(dir, (err, dirs) => {
      if (err) {
        reject(err);
      } else {
        resolve(dirs);
      }
    });
  });
}

export async function getProjectDirectories(): Promise<string[]> {
  const ignoreDirectories = ['build-projects', 'vscode-wpilib-outlineviewer'];
  const searchPath = path.join(process.cwd(), '..');
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
  const retItems = [];
  for (const i of items) {
    retItems.push(path.join(searchPath, i));
  }
  return retItems;
}
