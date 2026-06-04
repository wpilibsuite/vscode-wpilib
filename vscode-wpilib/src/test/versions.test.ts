'use strict';

import * as assert from 'assert';
import { isNewerVersion } from '../versions';

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
  new TestData('5.9.0', '5.9', true),
  new TestData('5.9.1', '5.9', true),
  new TestData('5.9', '5.9.0', false),
  new TestData('5.9', '5.9.1', false),
  new TestData('5.10.0', '5.9.0-1', true),
  new TestData('5.8.0', '5.9.0-1', false),
  new TestData('5.8.0-1', '5.8.0-2', false),
  new TestData('2019.1.1', '2019.1.1-beta-1', true),
  new TestData('2019.1.1-beta-2', '2019.1.1-beta-1', true),
  new TestData('2019.1.1-beta-2b', '2019.1.1-beta-2', true),
  new TestData('2019.1.1-beta-2b', '2019.1.1-beta-2a', true),
  new TestData('2019.1.1-beta-3', '2019.1.1-beta-2a', true),
  new TestData('2019.1.1-beta-3a', '2019.1.1-beta-2a', true),
  new TestData('2019.1.1-beta-3a', '2019.1.1-beta-3', true),
  new TestData('2019.1.1-beta-3', '2019.1.1-beta-3-pre5', true),
  new TestData('2019.1.1-beta-3-pre7', '2019.1.1-beta-3-pre6', true),
  new TestData('2019.1.1-beta-3a', '2019.1.1-beta-3-pre1', true),
  new TestData('2019.4.1', '0', true),
];

suite('Version Tests', () => {
  data.forEach((x) => {
    test(`Version Test: a: ${x.a} b: ${x.b} result: ${x.result}`, () => {
      assert.strictEqual(isNewerVersion(x.a, x.b), x.result);
    });
    test(`Invert Version Test: a: ${x.a} b: ${x.b} result: ${!x.result}`, () => {
      assert.strictEqual(!isNewerVersion(x.a, x.b), !x.result);
    });
    test(`Reverse Version Test: a: ${x.b} b: ${x.a} result: ${!x.result}`, () => {
      assert.strictEqual(isNewerVersion(x.b, x.a), !x.result);
    });
    test(`Reverse Invert Version Test: a: ${x.b} b: ${x.a} result: ${x.result}`, () => {
      assert.strictEqual(!isNewerVersion(x.b, x.a), x.result);
    });
  });
});

class EqualTestData {
  public readonly a: string;
  public readonly b: string;

  constructor(a: string, b: string) {
    this.a = a;
    this.b = b;
  }
}

const equalData = [
  new EqualTestData('0', '0'),
  new EqualTestData('0.0', '0.0'),
  new EqualTestData('0.0.0', '0.0.0'),
  new EqualTestData('0.0.0-0', '0.0.0-0'),
];

suite('Equal Version Tests', () => {
  equalData.forEach((x) => {
    test(`Version Test: a: ${x.a} b: ${x.b}`, () => {
      assert.strictEqual(isNewerVersion(x.a, x.b), false);
    });
    test(`Invert Version Test: a: ${x.a} b: ${x.b}`, () => {
      assert.strictEqual(!isNewerVersion(x.a, x.b), true);
    });
    test(`Reverse Version Test: a: ${x.b} b: ${x.a}`, () => {
      assert.strictEqual(isNewerVersion(x.b, x.a), false);
    });
    test(`Reverse Invert Version Test: a: ${x.b} b: ${x.a}`, () => {
      assert.strictEqual(!isNewerVersion(x.b, x.a), true);
    });
  });
});
