import * as fs from 'fs';
import * as path from 'path';
import * as npm from 'npm';
import * as vsce from 'vsce';
import * as jsonc from 'jsonc-parser';
import { exec } from './execution';
import { resolveAllPromises } from './util';

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
  const packageJsons: { loc: string, orig: string, new: string | undefined }[] = [];
  try {
    const projectDirectories = await getProjectDirectories();
    const searchPath = path.join(process.cwd(), '..');
    const fullProjectDirectories = [];
    let promiseArray: Promise<{ stdout: string; stderr: string; }>[] = [];
    for (const p of projectDirectories) {
      const fullP = path.join(searchPath, p);
      fullProjectDirectories.push(fullP);
      const pjson = path.join(fullP, 'package.json');
      packageJsons.push({ loc: pjson, orig: fs.readFileSync(pjson, 'utf8'), new: undefined });
      promiseArray.push(exec('npm install', {
        cwd: fullP
      }));
    }

    const finishedInstalls = await resolveAllPromises(promiseArray);



    const args = process.argv;

    if (args.length > 2) {
      for (const j of packageJsons) {
        const edits = jsonc.modify(j.orig, ['version'], args[2], {
          formattingOptions: {

          }
        });
        j.new = jsonc.applyEdits(j.orig, edits);
        fs.writeFileSync(j.loc, j.new);
      }
    }


    const packageResults: {stdout: string, stderr:string}[] = [];

    for (const p of fullProjectDirectories) {
      const r = await exec('npm run package', {
        cwd: p
      });
      console.log(r.stdout);
      packageResults.push(r);
    }

    for (const r of packageResults) {

    }
  }

  finally {
    for (const j of packageJsons) {
      fs.writeFileSync(j.loc, j.orig);
    }
  }
}

main().then(() => {
  console.log('finished');
}).catch((err) => {
  console.log(err);
});

