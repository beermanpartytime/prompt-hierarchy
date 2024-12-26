// utils/eventEmitter.js

class EventEmitter {
    constructor() {
        this.events = {};
    }

    on(event, listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
        return () => this.removeListener(event, listener); // Return an unsubscribe function
    }

    removeListener(event, listener) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(l => l !== listener);
        }
    }

    emit(event, ...args) {
        if (this.events[event]) {
            // Clone the listeners array to allow unsubscription during event handling
            const listeners = [...this.events[event]];
            listeners.forEach(listener => listener(...args));
        }
    }

    once(event, listener) {
        const onceListener = (...args) => {
            listener(...args);
            this.removeListener(event, onceListener);
        };
        this.on(event, onceListener);
    }
}

// Export the EventEmitter class
export { EventEmitter };
