import { DynamicNode } from '../core/DynamicNode';
export class CallbackNode extends DynamicNode {
    constructor(name, callback) {
        super(name);
        // A Sink consumes 1 item at a time from the previous node
        this.inputAmount = 1;
        this.callback = callback;
    }
    async run(data) {
        // 'data' is an array of size 1 containing the item
        const item = data[0];
        // Fire the callback to your main application
        this.callback(item);
    }
}
