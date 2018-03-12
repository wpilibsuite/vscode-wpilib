'use strict';

export class PromiseCondition {
    private hasBeenSet: boolean = false;
    private condSet: (() => void) | undefined = undefined;

    wait(): Promise<void> {
        return new Promise((resolve, _) => {
            this.condSet = () => {
                resolve();
            };
            if (this.hasBeenSet === true) {
                resolve();
            }
        });
    }

    set() {
        this.hasBeenSet = true;
        if (this.condSet !== undefined) {
            this.condSet();
        }
    }

    reset() {
        this.condSet = undefined;
        this.hasBeenSet = false;
    }
}