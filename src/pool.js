class Pool {
    constructor(maxWorkers) {
        this.running = 0;
        this.max = maxWorkers;
        this.queue = [];
    }

    isMaxedOut() {
        return this.running >= this.max;
    }

    nextTask() {
        this.running--;
        this.runTask();
    }

    addTask(payload) {
        this.queue.push(payload);
    }

    runTask() {
        if (this.isMaxedOut() || this.queue.length == 0) {
            return;
        }

        this.running++;
        const task = this.queue.shift();
        task();
    }

    run() {
        let startPoolThreadsCount = this.queue.length > this.max ? this.max : this.queue.length;

        for (let index = 0; index < startPoolThreadsCount; index++) {
            this.runTask();
        }
    }
}

export default Pool;