'use strict';

import * as assert from 'assert';
import { getUniqueMavenRepositories } from '../projectinfo';

suite('Project Info Tests', () => {
  test('Removes built-in repository URLs and their subpaths', () => {
    assert.deepStrictEqual(
      getUniqueMavenRepositories([
        'https://plugins.gradle.org/m2/',
        'https://frcmaven.wpi.edu/artifactory/release',
        'https://repo.example.com/maven',
      ]),
      ['https://repo.example.com/maven']
    );
  });

  test('Removes duplicate repository URLs', () => {
    assert.deepStrictEqual(
      getUniqueMavenRepositories([
        'https://repo.example.com/maven',
        'https://repo.example.com/maven',

      ]),
      ['https://repo.example.com/maven']
    );
  });

  test('Removes more-specific repository URLs', () => {
    assert.deepStrictEqual(
      getUniqueMavenRepositories([
        'https://repo.example.com/maven/releases',
        'https://repo.example.com/maven',
      ]),
      ['https://repo.example.com/maven']
    );
  });

  test('Removes duplicate and more-specific repository URLs', () => {
    assert.deepStrictEqual(
      getUniqueMavenRepositories([
        'https://repo.example.com/maven/releases',
        'https://repo.example.com/maven',
        'https://repo.example.com/maven',
        'https://another.example.com/repository',
      ]),
      ['https://repo.example.com/maven', 'https://another.example.com/repository']
    );
  });

  test('Keeps independent Maven repository URLs', () => {
    assert.deepStrictEqual(
      getUniqueMavenRepositories([
        'https://repo-one.example.com/maven',
        'https://repo-two.example.com/maven',
      ]),
      ['https://repo-one.example.com/maven', 'https://repo-two.example.com/maven']
    );
  });

  test('Returns an empty list when there are no Maven repository URLs', () => {
    assert.deepStrictEqual(getUniqueMavenRepositories([]), []);
  });

  test('Returns an empty list when there are no unique Maven repository URLs', () => {
    assert.deepStrictEqual(
      getUniqueMavenRepositories([
        'https://plugins.gradle.org/m2/',
        'https://frcmaven.wpi.edu/artifactory/release',
      ]),
      []
    );
  });
});
