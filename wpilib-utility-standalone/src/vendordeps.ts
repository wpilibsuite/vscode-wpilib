'use strict';

import { app, dialog, getCurrentWindow } from '@electron/remote';
import * as path from 'path';
import { logger } from './logger';
import { UtilitiesAPI } from './shared/utilitiesapi';
import { IJsonDependency, VendorLibrariesBase } from './shared/vendorlibrariesbase';
import { deleteFileAsync, existsAsync, readdirAsync } from './utilities';

const bWindow = getCurrentWindow();

class VendorLibraries extends VendorLibrariesBase {
  public constructor() {
    super(new UtilitiesAPI());
  }

  public async refreshAvailableDependencies(dir: string): Promise<void> {
    const deps = await this.getHomeDirDeps();

    const list = document.getElementById('availablelist') as HTMLUListElement;
    list.innerHTML = '';

    for (const dep of deps) {
      const innerDiv = document.createElement('li');
      const text = document.createTextNode(`${dep.name} (${dep.version})\t`);
      innerDiv.appendChild(text);
      const button = document.createElement('button');
      button.innerText = 'Install';
      button.dataset.uuid = dep.uuid;
      button.onclick = async () => {
        await this.installOfflineDependency(dir, dep.uuid);
        await this.refreshDependencies(dir);
      };
      innerDiv.appendChild(button);
      list.appendChild(innerDiv);
    }
  }

  public async uninstallDependency(dir: string, uuid: string): Promise<void> {
    const url = this.getVendorFolder(dir);

    const files = await readdirAsync(url);
    for (const file of files) {
      const fullPath = path.join(url, file);
      const result = await this.readFile(fullPath);
      if (result !== undefined && uuid === result.uuid) {
        await deleteFileAsync(fullPath);
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
        await this.uninstallDependency(dir, dep.uuid);
      };
      innerDiv.appendChild(button);
      list.appendChild(innerDiv);
    }
  }

  public async installOfflineDependency(dir: string, uuid: string) {
    const deps = await this.getHomeDirDeps();

    let fileDep: IJsonDependency | undefined;

    for (const d of deps) {
      if (d.uuid === uuid) {
        fileDep = d;
        break;
      }
    }

    if (fileDep === undefined) {
      alert('Failed to find dep to install');
      return;
    }

    // Load existing libraries
    const existing = await this.getDependencies(this.getVendorFolder(dir));

    for (const dep of existing) {
      if (dep.uuid === fileDep.uuid) {
        alert ('Library already installed');
        return;
      }
    }

    const success = await this.installDependency(fileDep, this.getVendorFolder(dir), true);
    if (success) {
      alert('Successfully installed ' + fileDep.name);
    } else {
      alert('Failed to install ' + fileDep.name);
    }
  }

  public async installOnlineDependency(dir: string, url: string) {
    let file;
    try {
      file = await this.loadFileFromUrl(url);
    } catch (err) {
      logger.log('Error fetching file', err);
      alert ('Failure ' + err);
      return;
    }
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

export async function selectProjectButton(): Promise<void> {
  const paths = await dialog.showOpenDialog(bWindow, {
    buttonLabel: 'Select Project (build.gradle)',
    defaultPath: app.getPath('documents'),
    filters: [
      { name: 'Build Files', extensions: ['gradle'] },
    ],
    message: 'Select your project by selecting build.grade',
    properties: [
      'openFile',
    ],
    title: 'Select your project',
  });
  if (paths.filePaths && paths.filePaths.length === 1) {
    if (await existsAsync(paths.filePaths[0])) {
      const input = document.getElementById('projectFolder') as HTMLInputElement;
      input.value = path.dirname(paths.filePaths[0]);
      const div = document.getElementById('validprojectdiv') as HTMLDivElement;
      div.style.display = null!;
      await vendorLibs.refreshDependencies(input.value);
      await vendorLibs.refreshAvailableDependencies(input.value);
    }
  } else {
    // TODO
  }
}

export async function refreshDependencies() {
  const input = document.getElementById('projectFolder') as HTMLInputElement;
  await vendorLibs.refreshDependencies(input.value);
}

export async function refreshAvailableDependencies() {
  const input = document.getElementById('projectFolder') as HTMLInputElement;
  await vendorLibs.refreshAvailableDependencies(input.value);
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
