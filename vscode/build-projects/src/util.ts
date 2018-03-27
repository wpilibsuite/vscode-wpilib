const CancelledError = 'Cancelled';

export function isCancelledError(error: any) {
  return error === CancelledError;
}

export class CancellationToken {

  private listeners: Function[] = [];
  private _cancelled: boolean = false;
  get isCancelled(): boolean { return this._cancelled; }

  subscribe(fn: Function): Function {
    this.listeners.push(fn);

    return () => {
      const index = this.listeners.indexOf(fn);

      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  cancel(): void {
    const emit = !this._cancelled;
    this._cancelled = true;

    if (emit) {
      this.listeners.forEach(l => l(CancelledError));
      this.listeners = [];
    }
  }
}

function mapPromise<T>(promise: Promise<T>) {
  return promise.then(result => ({success: true, result}))
  .catch(error => ({success: false, error}));
}

export function resolveAllPromises<T>(promises: Promise<T>[]) {
  return Promise.all(promises.map(mapPromise));

}
