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
];

suite('Version Tests', () => {

  data.forEach((x) => {
    test(`Version Test: a: ${x.a} b: ${x.b} result: ${x.result}`, () => {
      assert.strictEqual(versionGreaterThen(x.a, x.b), x.result);
    });
  });
});
