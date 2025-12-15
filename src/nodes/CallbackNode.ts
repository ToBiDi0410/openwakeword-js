import { DynamicNode } from '../core/DynamicNode';

export class CallbackNode<T> extends DynamicNode<T, void> {
    // A Sink consumes 1 item at a time from the previous node
    protected inputAmount = 1;
    private callback: (data: T) => void;

    constructor(name: string, callback: (data: T) => void) {
        super(name);
        this.callback = callback;
    }

    protected async run(data: T[]): Promise<void> {
        // 'data' is an array of size 1 containing the item
        const item = data[0];
        
        // Fire the callback to your main application
        this.callback(item);
    }
}