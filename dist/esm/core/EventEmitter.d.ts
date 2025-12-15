type Listener<T = any> = (event: T) => void;
export declare class EventEmitter {
    private listeners;
    on<T>(event: string, handler: Listener<T>): () => void;
    off<T>(event: string, handler: Listener<T>): void;
    emit<T>(event: string, payload?: T): void;
}
export {};
