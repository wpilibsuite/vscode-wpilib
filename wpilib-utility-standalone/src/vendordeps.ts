'use strict';

import * as electron from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { promisifyReadDir } from './shared/generator';
import { UtilitiesAPI } from './shared/utilitiesapi';
import { VendorLibrariesBase } from './shared/vendorlibrariesbase';
import { promisifyDeleteFile } from './utilities';

const dialog = electron.remote.dialog;
const bWindow = electron.remote.getCurrentWindow();

class VendorLibraries extends VendorLibrariesBase {
  public constructor() {
    super(new UtilitiesAPI());
  }

  public async uninstallDependencies(dir: string, uuid: string): Promise<void> {
    const url = this.getVendorFolder(dir);

    const files = await promisifyReadDir(url);
    for (const file of files) {
      const fullPath = path.join(url, file);
      const result = await this.readFile(fullPath);
      if (result !== undefined && uuid === result.uuid) {
        await promisifyDeleteFile(fullPath);
        break;
      }
    }
    await this.refreshDependencies(dir);
  }

  public async refreshDependencies(dir: string): Promise<void> {
    const deps = await this.getDependencies(this.getVendorFolder(dir));

    const list = document.getElementById('installedlist') as HTMLUListElement;
    list.innerHTML = '';

    for (const dep of deps) {
      const innerDiv = document.createElement('li');
      const text = document.createTextNode(`${dep.name} (${dep.version})\t`);
      innerDiv.appendChild(text);
      const button = document.createElement('button');
      button.innerText = 'Uninstall';
      button.dataset.uuid = dep.uuid;
      button.onclick = async () => {
        await this.uninstallDependencies(dir, dep.uuid);
      };
      innerDiv.appendChild(button);
      list.appendChild(innerDiv);
    }
  }

  public async installOnlineDependency(dir: string, url: string) {
    const file = await this.loadFileFromUrl(url);
    if (file !== undefined) {
      // Load existing libraries
      const existing = await this.getDependencies(this.getVendorFolder(dir));

      for (const dep of existing) {
        if (dep.uuid === file.uuid) {
          alert ('Library already installed');
          return;
        }
      }

      const success = await this.installDependency(file, this.getVendorFolder(dir), true);
      if (success) {
        alert('Successfully installed ' + file.name);
      } else {
        alert('Failed to install ' + file.name);
      }
    }
  }
}

const vendorLibs = new VendorLibraries();

export function selectProjectButton() {
  dialog.showOpenDialog(bWindow, {
    buttonLabel: 'Select Project (build.gradle)',
    defaultPath: electron.remote.app.getPath('documents'),
    filters: [
      { name: 'Build Files', extensions: ['gradle'] },
    ],
    message: 'Select your project by selecting build.grade',
    properties: [
      'openFile',
    ],
    title: 'Select your project',
  }, (paths) => {
    if (paths && paths.length === 1) {
      fs.exists(paths[0], async (exists) => {
        if (exists) {
          const input = document.getElementById('projectFolder') as HTMLInputElement;
          input.value = path.dirname(paths[0]);
          const div = document.getElementById('validprojectdiv') as HTMLDivElement;
          div.style.display = null;
          await vendorLibs.refreshDependencies(input.value);

        }
      });
    } else {
      // TODO
    }
  });
}

export async function refreshDependencies() {
  const input = document.getElementById('projectFolder') as HTMLInputElement;
  await vendorLibs.refreshDependencies(input.value);
}

export async function installOnlineLibrary() {
  const urlBox = document.getElementById('onlineurl') as HTMLInputElement;
  const url = urlBox.value;
  const input = document.getElementById('projectFolder') as HTMLInputElement;
  if (url === undefined || url === '') {
    alert('Empty Online URL. Please enter an online url');
    return;
  }
  try {
    await vendorLibs.installOnlineDependency(input.value, url);
    urlBox.value = '';
    await vendorLibs.refreshDependencies(input.value);
  } catch (err) {
    alert('Failed to install dependency because:\n' + err);
  }
}
