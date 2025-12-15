import * as ort from 'onnxruntime-web';
import { DynamicNode } from '../core/DynamicNode';
import { AudioFrame, Detection } from '../core/interfaces';

// --- Helper Class (Manages individual model history & inference) ---
class KeywordModel {
    public session: ort.InferenceSession;
    public windowSize: number;
    public history: Float32Array[];

    constructor(session: ort.InferenceSession, windowSize: number) {
        this.session = session;
        this.windowSize = windowSize;
        this.history = [];
        this.resetHistory();
    }

    resetHistory(): void {
        this.history = [];
        // Pre-fill history with zeros to avoid cold-start noise
        for (let i = 0; i < this.windowSize; i++) {
            this.history.push(new Float32Array(96).fill(0));
        }
    }

    async predict(embedding: Float32Array): Promise<number> {
        // Sliding window logic
        this.history.shift();
        this.history.push(embedding);
        
        // Flatten history for ONNX input ( [1, windowSize, 96] )
        const flattened = new Float32Array(this.windowSize * 96);
        for (let j = 0; j < this.history.length; j++) {
            flattened.set(this.history[j], j * 96);
        }

        const input = new ort.Tensor('float32', flattened, [1, this.windowSize, 96]);
        const res = await this.session.run({ [this.session.inputNames[0]]: input });
        
        // Output is a single probability float
        return (res[this.session.outputNames[0]].data as Float32Array)[0];
    }
}

// --- Global State Interface ---
interface KeywordGlobalState {
    models: Map<string, KeywordModel>;
    activeKeywords: Set<string>;
    initialized: boolean;
}

// --- Main Node Class ---
export class KeywordNode extends DynamicNode<AudioFrame, Detection[], KeywordGlobalState> {
    public modelsConfig: string[][]; // [['keyword_name', 'path/to/model.onnx'], ...]
    public executionProviders: string[];
    public threshold: number;

    protected inputAmount = 1;

    constructor(
        name: string,
        models: string[][], 
        executionProviders: string[] = ['wasm'], 
        threshold: number = 0.5
    ) {
        // Initialize empty global state
        super(name, {
            models: new Map(),
            activeKeywords: new Set(models.map(m => m[0])),
            initialized: false
        });

        this.modelsConfig = models;
        this.executionProviders = executionProviders;
        this.threshold = threshold;
    }

    /**
     * Internal helper to load all configured models
     */
    private async ensureInitialized(): Promise<void> {
        if (this.globalState.initialized) return;

        console.log(`[${this.name}] Loading ${this.modelsConfig.length} keyword models...`);

        const promises = this.modelsConfig.map(async ([keyword, path]) => {
            try {
                const session = await ort.InferenceSession.create(path, { 
                    executionProviders: this.executionProviders 
                });
                
                // Inspect model metadata to determine required window size
                let winSize = 16; // Default fallback
                const inputName = session.inputNames?.[0];
                if (inputName) {
                    const meta = session.inputMetadata?.[inputName as any];
                    //@ts-ignore - 'shape' access might vary by ORT version type defs
                    const dim = meta?.shape?.[1]; 
                    if (typeof dim === 'number' && Number.isFinite(dim)) {
                        winSize = dim;
                    }
                }
                
                this.globalState.models.set(keyword, new KeywordModel(session, winSize));
                // console.log(`[${this.name}] Loaded '${keyword}' (Window: ${winSize})`);
            } catch (err) {
                console.error(`[${this.name}] Failed to load '${keyword}' model:`, err);
                throw err;
            }
        });

        await Promise.all(promises);
        this.globalState.initialized = true;
        console.log(`[${this.name}] All models loaded.`);
    }

    protected async run(data: AudioFrame[]): Promise<void> {
        // 1. Lazy Load
        await this.ensureInitialized();

        const frame = data[0];

        // 2. Validation: We need embeddings to work
        if (!frame.embedding) {
            // Note: We don't throw here, we just skip processing this frame
            // because silence/VAD might produce frames without embeddings
            return; 
        }

        const detections: Detection[] = [];

        // 3. Run Inference for all active keywords
        // Parallelize predictions for better performance
        const predictionPromises = Array.from(this.globalState.models.entries()).map(async ([kw, model]) => {
            if (!this.globalState.activeKeywords.has(kw)) return;

            const score = await model.predict(frame.embedding!);
            
            if (score > this.threshold) {
                detections.push({ 
                    keyword: kw, 
                    score, 
                    timestamp: frame.id 
                });
            }
        });

        await Promise.all(predictionPromises);

        // 4. Output Logic
        if (detections.length > 0) {
            this.push(detections);
        }
    }
}