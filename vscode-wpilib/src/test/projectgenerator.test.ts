'use strict';

import * as assert from 'assert';
import { access, mkdtemp, readFile, rm } from 'fs/promises';
import { test } from 'mocha';
import { tmpdir } from 'os';
import * as path from 'path';
import { getWPILibApi, IExternalAPI } from '../api';
import { IPreferencesJson } from '../shared/preferencesjson';
import { ReplacementPatterns } from '../shared/projectGeneratorUtils';

async function ensureJavaFilesGeneratedCorrectly(tmp: string, api: IExternalAPI) {
  let robotJavaContent = await readFile(
    path.join(tmp, 'src', 'main', 'java', 'frc', 'robot', 'Robot.java')
  );
  let preferences: IPreferencesJson = JSON.parse(
    (await readFile(path.join(tmp, '.wpilib', 'wpilib_preferences.json'))).toString()
  );
  // Ensure packages were replaced in the template
  assert.ok(robotJavaContent.includes('frc.robot'));
  // Make sure preferences are correct
  assert.ok(preferences.currentLanguage === 'java');
  assert.ok(preferences.teamNumber === 9999);
  assert.ok(preferences.enableCppIntellisense === false);
  assert.ok(preferences.projectYear === api.getUtilitiesAPI().getWPILibYear());
}

async function ensureCppFilesGeneratedCorrectly(tmp: string, api: IExternalAPI) {
  assert.doesNotThrow(async () => {
    await access(path.join(tmp, 'src', 'main', 'cpp', 'Robot.cpp'));
    await access(path.join(tmp, 'src', 'main', 'include', 'Robot.hpp'));
  });
  let preferences: IPreferencesJson = JSON.parse(
    (await readFile(path.join(tmp, '.wpilib', 'wpilib_preferences.json'))).toString()
  );
  // Make sure preferences are correct
  assert.ok(preferences.currentLanguage === 'cpp');
  assert.ok(preferences.teamNumber === 9999);
  assert.ok(preferences.enableCppIntellisense === true);
  assert.ok(preferences.projectYear === api.getUtilitiesAPI().getWPILibYear());
}

async function ensureBaseFilesGeneratedCorrectly(tmp: string) {
  let buildGradleContent = await readFile(path.join(tmp, 'build.gradle'));
  // Make sure the GradleRIO version was replaced
  assert.ok(!buildGradleContent.includes(ReplacementPatterns.GRADLE_RIO_MARKER));
  // Make sure all the other important files are there
  assert.doesNotThrow(async () => {
    await access(path.join(tmp, '.vscode', 'launch.json'));
    await access(path.join(tmp, '.vscode', 'settings.json'));
    await access(path.join(tmp, 'gradle', 'wrapper', 'gradle-wrapper.jar'));
    await access(path.join(tmp, 'gradle', 'wrapper', 'gradle-wrapper.properties'));
    await access(path.join(tmp, 'vendordeps', 'CommandsV2.json'));
    await access(path.join(tmp, '.gitignore'));
    await access(path.join(tmp, 'gradlew'));
    await access(path.join(tmp, 'gradlew.bat'));
  });
}

suite('Project Generation Tests', () => {
  test('Java Template Project Generation New Folder', async () => {
    const api = await getWPILibApi();
    const tmp = await mkdtemp(path.join(tmpdir(), path.sep));
    assert.ok(api);
    assert.ok(
      await api
        .getExampleTemplateAPI()
        .createProject(true, 'java', 'Timed Robot', tmp, true, 'MyProject', 9999)
    );
    await ensureJavaFilesGeneratedCorrectly(path.join(tmp, 'MyProject'), api!);
    await ensureBaseFilesGeneratedCorrectly(path.join(tmp, 'MyProject'));
    await rm(tmp, { recursive: true });
  });

  test('Java Timed Robot Template Project Generation', async () => {
    const api = await getWPILibApi();
    const tmp = await mkdtemp(path.join(tmpdir(), path.sep));
    assert.ok(api);
    assert.ok(
      await api
        .getExampleTemplateAPI()
        .createProject(true, 'java', 'Timed Robot', tmp, false, 'MyProject', 9999)
    );
    await ensureJavaFilesGeneratedCorrectly(tmp, api!);
    await ensureBaseFilesGeneratedCorrectly(tmp);
    await rm(tmp, { recursive: true });
  });

  test('Java XRP Template Project Generation', async () => {
    const api = await getWPILibApi();
    const tmp = await mkdtemp(path.join(tmpdir(), path.sep));
    assert.ok(api);
    assert.ok(
      await api
        .getExampleTemplateAPI()
        .createProject(true, 'java', 'XRP - Timed Robot', tmp, false, 'MyProject', 9999)
    );
    await ensureJavaFilesGeneratedCorrectly(tmp, api!);
    await ensureBaseFilesGeneratedCorrectly(tmp);
    assert.doesNotThrow(async () => {
      await access(path.join(tmp, 'src', 'main', 'java', 'frc', 'robot', 'XRPDriveTrain.java'));
      await access(path.join(tmp, 'vendordeps', 'XRPVendordep.json'));
    });
    await rm(tmp, { recursive: true });
  });

  test('C++ Template Project Generation New Folder', async () => {
    const api = await getWPILibApi();
    const tmp = await mkdtemp(path.join(tmpdir(), path.sep));
    assert.ok(api);
    assert.ok(
      await api
        .getExampleTemplateAPI()
        .createProject(true, 'cpp', 'Timed Robot', tmp, true, 'MyProject', 9999)
    );
    await ensureCppFilesGeneratedCorrectly(path.join(tmp, 'MyProject'), api!);
    await ensureBaseFilesGeneratedCorrectly(path.join(tmp, 'MyProject'));
    await rm(tmp, { recursive: true });
  });

  test('C++ Timed Robot Template Project Generation', async () => {
    const api = await getWPILibApi();
    const tmp = await mkdtemp(path.join(tmpdir(), path.sep));
    assert.ok(api);
    assert.ok(
      await api
        .getExampleTemplateAPI()
        .createProject(true, 'cpp', 'Timed Robot', tmp, false, 'MyProject', 9999)
    );
    await ensureCppFilesGeneratedCorrectly(tmp, api!);
    await ensureBaseFilesGeneratedCorrectly(tmp);
    await rm(tmp, { recursive: true });
  });

  test('C++ XRP Example Project Generation', async () => {
    const api = await getWPILibApi();
    const tmp = await mkdtemp(path.join(tmpdir(), path.sep));
    assert.ok(api);
    assert.ok(
      await api
        .getExampleTemplateAPI()
        .createProject(false, 'cpp', 'XRP Timed', tmp, false, 'MyProject', 9999)
    );
    await ensureCppFilesGeneratedCorrectly(tmp, api!);
    await ensureBaseFilesGeneratedCorrectly(tmp);
    assert.doesNotThrow(
      async () => await access(path.join(tmp, 'vendordeps', 'XRPVendordep.json'))
    );
    await rm(tmp, { recursive: true });
  });
});
