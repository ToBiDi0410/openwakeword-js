export interface NodeError {
    message: string;
    stack?: string;
    timestamp: Date;
    originalError: any;
}

/**
 * Base class for all dynamic nodes.
 */
export abstract class DynamicNode<In = any, Out = any, GlobalState = any, RunState = any> {
    public name: string;
    
    // Topology
    protected nextNodes: DynamicNode<Out, any>[] = [];
    protected prevNodes: DynamicNode<any, In>[] = [];
    
    // Data Management
    protected outputBuffer: Out[] = [];
    public maxBufferSize: number = 300; // <--- Cap to prevent memory leaks

    // Execution Flags
    public isRunning: boolean = false;
    public isErrored: boolean = false;
    public error: NodeError | null = null;
    
    // Statistics
    public runningSince: Date | null = null;    // When current run started
    public totalConsumed: number = 0;           // Total inputs processed
    public totalProduced: number = 0;           // Total outputs generated
    public totalDropped: number = 0;           // Total outputs generated
    public averageConsumeTime: number = 0;      // Avg time (ms) to run() one batch
    
    // State Management
    public globalState: GlobalState;   
    public state: RunState | null = null;
    
    // Internal
    private readonly initialGlobalStateFactory: () => GlobalState;
    protected abstract inputAmount: number; 
    private prevNodeIndex: number = 0; 

    constructor(name: string, initialGlobalState?: GlobalState) {
        this.name = name;
        
        if (initialGlobalState) {
            const stateClone = structuredClone(initialGlobalState);
            this.initialGlobalStateFactory = () => structuredClone(stateClone);
            this.globalState = this.initialGlobalStateFactory();
        } else {
            this.initialGlobalStateFactory = () => ({} as GlobalState);
            this.globalState = {} as GlobalState;
        }
    }

    // --- Visualization ---
    public toDownStream(prefix: string = '', visited: Set<DynamicNode<any, any>> = new Set()): string {
        let output = '';
        const isRoot = prefix === '';

        // 1. If Root, add self-header to output
        if (isRoot) {
            const stats = `(ΣIn: ${this.totalConsumed} | ΣOut: ${this.totalProduced} | ΣDropped: ${this.totalDropped} | Avg: ${this.averageConsumeTime.toFixed(1)}ms, Errored: ${this.isErrored}, Running: ${this.isRunning})`;
            output += `[${this.name}] ${stats}\n`;
        }

        // 2. Cycle detection
        if (visited.has(this)) return output; 
        visited.add(this);

        // 3. Prepare Buffer String
        let bufferStr = 'empty';
        if (this.outputBuffer.length > 0) {
            bufferStr = `[${this.outputBuffer.length}]`;
        }
        
        const arrow = ` --${bufferStr}--> `;

        // 4. Traverse Children
        for (let i = 0; i < this.nextNodes.length; i++) {
            const child = this.nextNodes[i];
            const isLast = i === this.nextNodes.length - 1;
            const branch = isLast ? '└──' : '├──';
            
            // Append Child Name + Stats line
            const childStats = `(ΣIn: ${child.totalConsumed} | ΣOut: ${child.totalProduced} | ΣDropped: ${child.totalDropped} | Avg: ${child.averageConsumeTime.toFixed(1)}ms, Errored: ${child.isErrored}, Running: ${child.isRunning})`;
            output += `${prefix}${branch}${arrow}[${child.name}] ${childStats}\n`;
            
            // Recurse and append result
            const childPrefix = prefix + (isLast ? '    ' : '│   ');
            output += child.toDownStream(childPrefix, visited);
        }

        return output;
    }

    // --- Topology ---

    public to(node: DynamicNode<Out, any>): DynamicNode<Out, any> {
        this.nextNodes.push(node);
        node.prevNodes.push(this);
        return node;
    }

    // --- Output Buffer Logic ---

    protected push(data: Out): void {
        this.totalProduced++; 
        this.outputBuffer.push(data);

        // Overflow Protection
        if (this.outputBuffer.length > this.maxBufferSize) {
            const dropCount = this.outputBuffer.length - this.maxBufferSize;
            this.totalDropped += dropCount;

            // Warn only occasionally to avoid spamming console
            console.warn(`[${this.name}] Buffer Overflow (${this.outputBuffer.length}). Dropping ${dropCount} oldest items`);
            
            // Drop from the START (Oldest items)
            // We want to keep the newest data so we remain "live"
            this.outputBuffer.splice(0, dropCount);
        }

        this.nextNodes.forEach(n => n.tryRun());
    }

    public consume(amount: number): Out[] | null {
        if (this.outputBuffer.length < amount) return null;
        return this.outputBuffer.splice(0, amount);
    }

    // --- Input Logic ---

    protected consumeFromPrev(amount: number): In[] | null {
        if (this.prevNodes.length === 0) return null;

        for (let i = 0; i < this.prevNodes.length; i++) {
            const idx = (this.prevNodeIndex + i) % this.prevNodes.length;
            const parent = this.prevNodes[idx];

            const data = parent.consume(amount);
            if (data) {
                this.prevNodeIndex = (idx + 1) % this.prevNodes.length;
                return data;
            }
        }
        return null;
    }

    // --- Reset Logic ---

    public reset(): void {
        console.log(`[${this.name}] Hard Resetting...`);
        this.isErrored = false;
        this.error = null;
        this.state = null;
        
        // Reset Stats
        this.runningSince = null;
        this.totalConsumed = 0;
        this.totalProduced = 0;
        this.totalDropped = 0;
        this.averageConsumeTime = 0;

        this.globalState = this.initialGlobalStateFactory();
        this.tryRun();
    }

    // --- Execution Logic ---

    public async tryRun(): Promise<void> {
        if (this.isRunning || this.isErrored) return;

        this.isRunning = true;
        this.runningSince = new Date(); // <--- Mark Start

        try {
            let keepGoing = true;
            while (keepGoing) {
                if (this.isErrored) { keepGoing = false; break; }

                const items = this.consumeFromPrev(this.inputAmount);

                if (items) {
                    this.totalConsumed += items.length; // <--- Track Consumption
                    this.state = {} as RunState; 
                    
                    // Measure Execution Time
                    const start = performance.now();
                    await this.run(items);
                    const duration = performance.now() - start;

                    // Update Average (Exponential Moving Average for recent weighting)
                    if (this.averageConsumeTime === 0) {
                        this.averageConsumeTime = duration;
                    } else {
                        // 90% history, 10% new
                        this.averageConsumeTime = (this.averageConsumeTime * 0.9) + (duration * 0.1);
                    }

                    this.state = null;
                    keepGoing = true;
                } else {
                    keepGoing = false;
                }
            }
        } catch (err: any) {
            console.error(`[${this.name}] Error:`, err.message);
            this.isErrored = true;
            this.error = {
                message: err.message || "Unknown Error",
                stack: err.stack,
                timestamp: new Date(),
                originalError: err
            };
        } finally {
            this.isRunning = false;
            this.runningSince = null; // <--- Mark Stop
        }
    }

    protected abstract run(data: In[]): Promise<void>;

}