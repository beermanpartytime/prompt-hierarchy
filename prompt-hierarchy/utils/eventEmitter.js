class EventEmitter {
    constructor() {
        this.events = {};
        this.debugEnabled = localStorage.getItem('eventTracing') === 'true';
    }

    on(event, listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
        if (this.debugEnabled) {
            console.debug(`[EventEmitter] Added listener for: ${event}`);
        }
        return () => this.removeListener(event, listener);
    }

    removeListener(event, listener) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(l => l !== listener);
            if (this.debugEnabled) {
                console.debug(`[EventEmitter] Removed listener for: ${event}`);
            }
        }
    }

    emit(event, ...args) {
        if (this.debugEnabled) {
            console.debug(`[EventEmitter] Emitting: ${event}`, args);
        }

        if (this.events[event]) {
            const listeners = [...this.events[event]];
            listeners.forEach(listener => {
                try {
                    listener(...args);
                } catch (error) {
                    console.error(`[EventEmitter] Error in listener for ${event}:`, error);
                    console.trace();
                }
            });
        }
    }

    once(event, listener) {
        const onceListener = (...args) => {
            listener(...args);
            this.removeListener(event, onceListener);
        };
        this.on(event, onceListener);
        if (this.debugEnabled) {
            console.debug(`[EventEmitter] Added one-time listener for: ${event}`);
        }
    }

    enableDebug() {
        this.debugEnabled = true;
        localStorage.setItem('eventTracing', 'true');
    }

    disableDebug() {
        this.debugEnabled = false;
        localStorage.setItem('eventTracing', 'false');
    }
}

export { EventEmitter };