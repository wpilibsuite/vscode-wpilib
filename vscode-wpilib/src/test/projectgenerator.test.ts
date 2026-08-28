'use strict';

import * as assert from 'assert';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { test } from 'mocha';
import { tmpdir } from 'os';
import * as path from 'path';
import { getWPILibApi, IExternalAPI } from '../api';
import { generateCopyJava } from '../shared/generator';
import { IPreferencesJson } from '../shared/preferencesjson';
import { ReplacementPatterns } from '../shared/projectGeneratorUtils';

async function ensureJavaFilesGeneratedCorrectly(tmp: string, api: IExternalAPI) {
  const robotJavaContent = await readFile(
    path.join(tmp, 'src', 'main', 'java', 'first', 'robot', 'Robot.java')
  );
  const preferences: IPreferencesJson = JSON.parse(
    (await readFile(path.join(tmp, '.wpilib', 'wpilib_preferences.json'))).toString()
  ) as IPreferencesJson;
  // Ensure packages were replaced in the template
  assert.ok(robotJavaContent.includes('first.robot'));
  // Make sure preferences are correct
  assert.ok(preferences.currentLanguage === 'java');
  assert.ok(preferences.teamNumber === 9999);
  assert.ok(preferences.enableCppIntellisense === false);
  assert.ok(preferences.projectYear === api.getUtilitiesAPI().getWPILibYear());
}

async function ensureCppFilesGeneratedCorrectly(tmp: string, api: IExternalAPI) {
  assert.equal(await access(path.join(tmp, 'src', 'main', 'cpp', 'Robot.cpp')), undefined);
  assert.equal(await access(path.join(tmp, 'src', 'main', 'include', 'Robot.hpp')), undefined);
  const preferences: IPreferencesJson = JSON.parse(
    (await readFile(path.join(tmp, '.wpilib', 'wpilib_preferences.json'))).toString()
  ) as IPreferencesJson;
  // Make sure preferences are correct
  assert.ok(preferences.currentLanguage === 'cpp');
  assert.ok(preferences.teamNumber === 9999);
  assert.ok(preferences.enableCppIntellisense === true);
  assert.ok(preferences.projectYear === api.getUtilitiesAPI().getWPILibYear());
}

async function ensureBaseFilesGeneratedCorrectly(tmp: string) {
  const buildGradleContent = await readFile(path.join(tmp, 'build.gradle'));
  // Make sure the GradleRIO version was replaced
  assert.ok(!buildGradleContent.includes(ReplacementPatterns.GRADLE_RIO_MARKER));
  // Make sure all the other important files are there
  assert.equal(await access(path.join(tmp, '.vscode', 'launch.json')), undefined);
  assert.equal(await access(path.join(tmp, '.vscode', 'settings.json')), undefined);
  assert.equal(await access(path.join(tmp, 'gradle', 'wrapper', 'gradle-wrapper.jar')), undefined);
  assert.equal(
    await access(path.join(tmp, 'gradle', 'wrapper', 'gradle-wrapper.properties')),
    undefined
  );
  assert.equal(await access(path.join(tmp, 'vendordeps', 'CommandsV2.json')), undefined);
  assert.equal(await access(path.join(tmp, '.gitignore')), undefined);
  assert.equal(await access(path.join(tmp, 'gradlew')), undefined);
  assert.equal(await access(path.join(tmp, 'gradlew.bat')), undefined);
}

suite('Project Generation Tests', () => {
  test('Java Gradle Import Preserves Main Class', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), path.sep));
    const sourceFolder = path.join(tmp, 'import', 'src');
    const gradleRoot = path.join(tmp, 'gradle');
    const gradleFolder = path.join(gradleRoot, 'java');
    const sharedGradleFolder = path.join(gradleRoot, 'shared');
    const destinationFolder = path.join(tmp, 'generated');
    const importedMainFile = path.join(sourceFolder, 'main', 'java', 'frc', 'robot', 'Main.java');

    try {
      await mkdir(path.dirname(importedMainFile), { recursive: true });
      await mkdir(gradleFolder, { recursive: true });
      await mkdir(sharedGradleFolder, { recursive: true });
      await writeFile(importedMainFile, 'package frc.robot;\n\npublic final class Main {}\n');
      await writeFile(
        path.join(gradleFolder, 'build.gradle'),
        `def ROBOT_MAIN_CLASS = "${ReplacementPatterns.ROBOT_CLASS_MARKER}"\n` +
          `id "edu.wpi.first.GradleRIO" version "${ReplacementPatterns.GRADLE_RIO_MARKER}"\n`
      );
      await writeFile(path.join(gradleRoot, 'version.txt'), '2027.0.0');
      await writeFile(path.join(sharedGradleFolder, 'gradlew'), '');

      assert.ok(
        await generateCopyJava(
          path.join(tmp, 'resources', 'java'),
          sourceFolder,
          undefined,
          gradleFolder,
          destinationFolder,
          undefined,
          'frc.robot.Main',
          '',
          true,
          []
        )
      );

      const buildGradleContent = await readFile(
        path.join(destinationFolder, 'build.gradle'),
        'utf8'
      );
      assert.ok(buildGradleContent.includes('def ROBOT_MAIN_CLASS = "frc.robot.Main"'));
      assert.equal(
        await readFile(
          path.join(destinationFolder, 'src', 'main', 'java', 'frc', 'robot', 'Main.java'),
          'utf8'
        ),
        'package frc.robot;\n\npublic final class Main {}\n'
      );
      await assert.rejects(
        access(path.join(destinationFolder, 'src', 'main', 'java', 'first', 'Main.java'))
      );
    } finally {
      await rm(tmp, { recursive: true });
    }
  });

  test('Java Template Project Generation New Folder', async () => {
    const api = await getWPILibApi();
    const tmp = await mkdtemp(path.join(tmpdir(), path.sep));
    assert.ok(api);
    assert.ok(
      await api
        .getExampleTemplateAPI()
        .createProject(true, 'java', 'Timed Robot', tmp, true, 'MyProject', 9999)
    );
    await ensureJavaFilesGeneratedCorrectly(path.join(tmp, 'MyProject'), api);
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
    await ensureJavaFilesGeneratedCorrectly(tmp, api);
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
    await ensureJavaFilesGeneratedCorrectly(tmp, api);
    await ensureBaseFilesGeneratedCorrectly(tmp);
    assert.doesNotThrow(async () => {
      await access(path.join(tmp, 'src', 'main', 'java', 'first', 'robot', 'XRPDriveTrain.java'));
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
    await ensureCppFilesGeneratedCorrectly(path.join(tmp, 'MyProject'), api);
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
    await ensureCppFilesGeneratedCorrectly(tmp, api);
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
    await ensureCppFilesGeneratedCorrectly(tmp, api);
    await ensureBaseFilesGeneratedCorrectly(tmp);
    assert.equal(await access(path.join(tmp, 'vendordeps', 'XRPVendordep.json')), undefined);
    await rm(tmp, { recursive: true });
  });
});
