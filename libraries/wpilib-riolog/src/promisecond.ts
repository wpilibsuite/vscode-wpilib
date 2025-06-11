"use strict";

export class PromiseCondition {
  private hasBeenSet: boolean = false;
  private condSet: (() => void) | undefined = undefined;

  public wait(): Promise<void> {
    return new Promise((resolve, _) => {
      this.condSet = () => {
        resolve();
      };
      if (this.hasBeenSet === true) {
        resolve();
      }
    });
  }

  public set() {
    this.hasBeenSet = true;
    if (this.condSet !== undefined) {
      this.condSet();
    }
  }

  public reset() {
    this.condSet = undefined;
    this.hasBeenSet = false;
  }
}
