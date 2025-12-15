export interface NodeError {
    message: string;
    stack?: string;
    timestamp: Date;
    originalError: any;
}
/**
 * Base class for all dynamic nodes.
 */
export declare abstract class DynamicNode<In = any, Out = any, GlobalState = any, RunState = any> {
    name: string;
    protected nextNodes: DynamicNode<Out, any>[];
    protected prevNodes: DynamicNode<any, In>[];
    protected outputBuffer: Out[];
    maxBufferSize: number;
    isRunning: boolean;
    isErrored: boolean;
    error: NodeError | null;
    runningSince: Date | null;
    totalConsumed: number;
    totalProduced: number;
    totalDropped: number;
    averageConsumeTime: number;
    globalState: GlobalState;
    state: RunState | null;
    private readonly initialGlobalStateFactory;
    protected abstract inputAmount: number;
    private prevNodeIndex;
    constructor(name: string, initialGlobalState?: GlobalState);
    toDownStream(prefix?: string, visited?: Set<DynamicNode<any, any>>): string;
    to(node: DynamicNode<Out, any>): DynamicNode<Out, any>;
    protected push(data: Out): void;
    consume(amount: number): Out[] | null;
    protected consumeFromPrev(amount: number): In[] | null;
    reset(): void;
    tryRun(): Promise<void>;
    protected abstract run(data: In[]): Promise<void>;
}
