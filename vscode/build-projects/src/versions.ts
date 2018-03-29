import * as fs from 'fs';
import * as path from 'path';
import * as jsonc from 'jsonc-parser';

export interface IVersionsEditor {
  fileLoc: string;
  lockFileLoc: string;
  original: string;
  originalLock: string;
}

export function setVersions(directories: string[], version: string): IVersionsEditor[] {
  let retArr: IVersionsEditor[] = [];
  for (const d of directories) {
    const packageJsonLoc = path.join(d, 'package.json');
    const lockPackageJsonLoc = path.join(d, 'package-lock.json');
    const original: string | undefined = undefined;
    const originalLock: string | undefined = undefined;
    try {
      const original = fs.readFileSync(packageJsonLoc, 'utf8');
      const originalLock = fs.readFileSync(lockPackageJsonLoc, 'utf8');
      const edits = jsonc.modify(original, ['version'], version, {
        formattingOptions: {

        }
      });
      const editsLock = jsonc.modify(originalLock, ['version'], version, {
        formattingOptions: {

        }
      });
      const newPackage = jsonc.applyEdits(original, edits);
      const newLock = jsonc.applyEdits(originalLock, editsLock);
      fs.writeFileSync(packageJsonLoc, newPackage, 'utf8');
      fs.writeFileSync(lockPackageJsonLoc, newLock, 'utf8');
      retArr.push({
        fileLoc: packageJsonLoc,
        lockFileLoc: lockPackageJsonLoc,
        original: original,
        originalLock: originalLock
      });
    } catch (err) {
      if (original !== undefined) {
        fs.writeFileSync(packageJsonLoc, original, 'utf8');
      }
      if (originalLock !== undefined) {
        fs.writeFileSync(lockPackageJsonLoc, originalLock, 'utf8');
      }
    }
  }

  return retArr;
}

export function restoreVersions(old: IVersionsEditor[]) {
  for (const o of old) {
    try {
      fs.writeFileSync(o.fileLoc, o.original, 'utf8');
      fs.writeFileSync(o.lockFileLoc, o.originalLock, 'utf8');
    } catch (err) {
      console.log(err);
    }
  }
}
