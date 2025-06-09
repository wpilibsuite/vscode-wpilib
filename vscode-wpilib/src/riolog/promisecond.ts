'use strict';

export class PromiseCondition {
  private hasBeenSet: boolean = false;
  private condSet: (() => void) | undefined = undefined;

  public wait(): Promise<void> {
    return new Promise((resolve, _) => {
      this.condSet = () => {
        resolve();
      };
      if (this.hasBeenSet) {
        resolve();
      }
    });
  }

  public set() {
    this.hasBeenSet = true;
    if (this.condSet) {
      this.condSet();
    }
  }

  public reset() {
    this.condSet = undefined;
    this.hasBeenSet = false;
  }
}
