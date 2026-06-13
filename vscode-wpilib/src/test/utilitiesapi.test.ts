'use strict';

import * as assert from 'assert';
import * as path from 'path';
import { getWPILibHomeDirForPlatform, getWPILibYear } from '../shared/utilitiesapi';

suite('Utilities API Tests', () => {
  const year = getWPILibYear();
  const homeDir = path.join(path.sep, 'home', 'testuser');
  const xdgDataHome = path.join(path.sep, 'xdg', 'data');

  test('macOS WPILib home uses hidden home folder', () => {
    assert.strictEqual(
      getWPILibHomeDirForPlatform('darwin', homeDir, {}),
      path.join(homeDir, '.wpilib', year)
    );
  });

  test('Linux WPILib home uses XDG_DATA_HOME when set', () => {
    assert.strictEqual(
      getWPILibHomeDirForPlatform('linux', homeDir, { XDG_DATA_HOME: xdgDataHome }),
      path.join(xdgDataHome, '.wpilib', year)
    );
  });

  test('Linux WPILib home falls back to hidden home folder', () => {
    assert.strictEqual(
      getWPILibHomeDirForPlatform('linux', homeDir, {}),
      path.join(homeDir, '.wpilib', year)
    );
  });

  test('Linux WPILib home ignores empty XDG_DATA_HOME', () => {
    assert.strictEqual(
      getWPILibHomeDirForPlatform('linux', homeDir, { XDG_DATA_HOME: '' }),
      path.join(homeDir, '.wpilib', year)
    );
  });

  test('Windows WPILib home still uses public folder', () => {
    assert.strictEqual(
      getWPILibHomeDirForPlatform('win32', homeDir, { PUBLIC: 'C:\\Users\\Public' }),
      path.join('C:\\Users\\Public', 'wpilib', year)
    );
  });
});
