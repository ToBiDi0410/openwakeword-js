import * as ort from 'onnxruntime-web';
import { DynamicNode } from '../core/DynamicNode';
import { AudioFrame } from '../core/interfaces';

// Define the persistent state
interface VadGlobalState {
    session: ort.InferenceSession | null;
    h: ort.Tensor | null;
    c: ort.Tensor | null;
}

export class VadNode extends DynamicNode<AudioFrame, AudioFrame, VadGlobalState> {
    public modelPath: string;
    public executionProviders: string[];

    // Process 1 frame at a time
    protected inputAmount = 1;

    constructor(
        name: string,
        modelPath: string, 
        executionProviders: string[] = ['wasm']
    ) {
        // Initialize state as empty/null. 
        // DynamicNode.reset() will revert to this structure.
        super(name, {
            session: null,
            h: null,
            c: null
        });

        this.modelPath = modelPath;
        this.executionProviders = executionProviders;
    }

    /**
     * Initializes the ONNX session if needed.
     * Also resets/initializes the Context Tensors (h and c) if they are missing.
     */
    private async ensureInitialized(): Promise<void> {
        // 1. Load Session
        if (!this.globalState.session) {
            console.log(`[${this.name}] Loading VAD model...`);
            this.globalState.session = await ort.InferenceSession.create(this.modelPath, {
                executionProviders: this.executionProviders
            });
        }

        // 2. Initialize Context Tensors (h, c)
        // Silero VAD requires input state shape: [2, 1, 64]
        if (!this.globalState.h || !this.globalState.c) {
            this.resetContextTensors();
        }
    }

    /**
     * Helper to zero out the VAD context (effectively forgetting previous audio).
     */
    private resetContextTensors(): void {
        const zeros = new Float32Array(2 * 1 * 64).fill(0);
        this.globalState.h = new ort.Tensor('float32', zeros, [2, 1, 64]);
        this.globalState.c = new ort.Tensor('float32', zeros, [2, 1, 64]);
    }

    protected async run(data: AudioFrame[]): Promise<void> {
        // 1. Lazy Init
        await this.ensureInitialized();

        const frame = data[0];
        const session = this.globalState.session!; // Non-null assertion after ensureInitialized

        // 2. Prepare Inputs
        // 
        // Input: [1, frame_length]
        const inputTensor = new ort.Tensor('float32', frame.raw, [1, frame.raw.length]);
        
        // Sample Rate: scalar int64
        const srTensor = new ort.Tensor('int64', [BigInt(frame.sampleRate)], []);

        // 3. Inference
        // We feed current h/c and get new hn/cn back
        const res = await session.run({ 
            input: inputTensor, 
            sr: srTensor, 
            h: this.globalState.h!, 
            c: this.globalState.c! 
        });

        // 4. Update Context for next frame
        this.globalState.h = res.hn;
        this.globalState.c = res.cn;
        
        // 5. Update Frame Data
        // Output is a single probability value [0..1]
        frame.vadConfidence = (res.output.data as Float32Array)[0];
        frame.isSpeech = frame.vadConfidence > 0.5;
        
        // 6. Push to next node
        this.push(frame);
    }
}