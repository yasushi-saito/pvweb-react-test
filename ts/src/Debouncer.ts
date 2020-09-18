class Debouncer {
  private timer: number = null;

  constructor(
    private readonly timeoutMs: number = 100
  ) {}

  run(fn: () => void) {
    this.stop();
    this.timer = window.setTimeout(() => {
      this.timer = null;
      fn();
    }, this.timeoutMs);
  }

  stop() {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

export default Debouncer;
