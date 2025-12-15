type Listener<T = any> = (event: T) => void;

export class EventEmitter {
    private listeners: Map<string, Set<Listener>> = new Map();

    public on<T>(event: string, handler: Listener<T>): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(handler);
        // Return unsubscribe function
        return () => this.off(event, handler);
    }

    public off<T>(event: string, handler: Listener<T>): void {
        const set = this.listeners.get(event);
        if (set) {
            set.delete(handler);
        }
    }

    public emit<T>(event: string, payload?: T): void {
        const set = this.listeners.get(event);
        if (set) {
            set.forEach(handler => handler(payload));
        }
    }
}