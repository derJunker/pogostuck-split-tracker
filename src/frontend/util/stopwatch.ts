export class Stopwatch {
    private startTime: number = 0;
    private elapsed: number = 0;
    private running: boolean = false;
    private intervalId: number | null = null;
    private readonly onUpdate?: (elapsed: number) => void;

    constructor(onUpdate?: (elapsed: number) => void) {
        this.onUpdate = onUpdate;
    }

    start() {
        if (!this.running) {
            this.running = true;
            this.startTime = Date.now() - this.elapsed;
            this.intervalId = window.setInterval(() => {
                this.elapsed = Date.now() - this.startTime;
                if (this.onUpdate) this.onUpdate(this.elapsed);
            }, 33);
        }
    }

    stop() {
        if (this.running) {
            this.running = false;
            if (this.intervalId !== null) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
            this.elapsed = Date.now() - this.startTime;
            if (this.onUpdate) this.onUpdate(this.elapsed);
        }
    }

    reset() {
        this.stop();
        this.elapsed = 0;
        if (this.onUpdate) this.onUpdate(this.elapsed);
    }

    getElapsed(): number {
        return this.elapsed;
    }
}