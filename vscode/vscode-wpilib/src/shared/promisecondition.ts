'use strict';

export class PromiseCondition<T> {
  private hasBeenSet: boolean = false;
  private value: T;
  private condSet: ((value: T) => void) | undefined = undefined;

  public constructor(defaultValue: T) {
    this.value = defaultValue;
  }

  public wait(): Promise<T> {
    return new Promise((resolve, _) => {
      this.condSet = (value) => {
        resolve(value);
      };
      if (this.hasBeenSet === true) {
        resolve(this.value);
      }
    });
  }

  public set(value: T) {
    this.value = value;
    this.hasBeenSet = true;
    if (this.condSet !== undefined) {
      this.condSet(value);
    }
  }

  public reset(value: T) {
    this.value = value;
    this.condSet = undefined;
    this.hasBeenSet = false;
  }
}
