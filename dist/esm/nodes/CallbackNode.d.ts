import { DynamicNode } from '../core/DynamicNode';
export declare class CallbackNode<T> extends DynamicNode<T, void> {
    protected inputAmount: number;
    private callback;
    constructor(name: string, callback: (data: T) => void);
    protected run(data: T[]): Promise<void>;
}
