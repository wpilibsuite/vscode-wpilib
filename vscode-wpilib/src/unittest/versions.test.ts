'use strict';

import * as assert from 'assert';
import { versionGreaterThen } from '../versions';

class TestData {
  public readonly a: string;
  public readonly b: string;
  public readonly result: boolean;

  constructor(a: string, b: string, result: boolean) {
    this.a = a;
    this.b = b;
    this.result = result;
  }
}

const data = [
  new TestData('2', '1', true),
  new TestData('1', '2', false),
  new TestData('5.10.0', '5.9.0', true),
  new TestData('5.9.0', '5.9.0-1', true),
  new TestData('5.10.0', '5.9.0-1', true),
  new TestData('5.8.0', '5.9.0-1', false),
  new TestData('5.8.0-1', '5.8.0-2', false),
  new TestData('5.8.0-2', '5.8.0-2', false),
  new TestData('2019.1.1', '2019.1.1-beta-1', true),
  new TestData('2019.1.1-beta-2', '2019.1.1-beta-1', true),
  new TestData('2019.1.1-beta-2b', '2019.1.1-beta-2', true),
  new TestData('2019.1.1-beta-2b', '2019.1.1-beta-2a', true),
];

suite('Version Tests', () => {

  data.forEach((x) => {
    test(`Version Test: a: ${x.a} b: ${x.b} result: ${x.result}`, () => {
      assert.strictEqual(versionGreaterThen(x.a, x.b), x.result);
    });
  });
});
