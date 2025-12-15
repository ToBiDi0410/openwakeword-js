"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventEmitter = void 0;
class EventEmitter {
    constructor() {
        this.listeners = new Map();
    }
    on(event, handler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(handler);
        // Return unsubscribe function
        return () => this.off(event, handler);
    }
    off(event, handler) {
        const set = this.listeners.get(event);
        if (set) {
            set.delete(handler);
        }
    }
    emit(event, payload) {
        const set = this.listeners.get(event);
        if (set) {
            set.forEach(handler => handler(payload));
        }
    }
}
exports.EventEmitter = EventEmitter;
