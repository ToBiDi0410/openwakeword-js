import { env } from 'onnxruntime-web';
import { MicrophoneNode } from './nodes/MicrophoneNode';
import { VadNode } from './nodes/VadNode';
import { VadStateNode } from './nodes/VadStateNode';
import { FeatureNode } from './nodes/FeatureNode';
import { KeywordNode } from './nodes/KeywordNode';
import { CallbackNode } from './nodes/CallbackNode';
import { Detection } from './core/interfaces';
import { EventEmitter } from './core/EventEmitter';

export interface OpenWakeWordJSOptions {
    // Microphone
    sampleRate?: number;
    frameSize?: number;

    // VAD
    vadModelPath: string;
    vadHangoverFrames?: number;

    // Features
    melModelPath: string;
    embeddingModelPath: string;

    // Keywords
    models: string[][];
    threshold?: number;
    cooldownMs?: number;

    // Global
    executionProviders?: string[];
    wasmPaths?: string|Record<string, string>;
}

export class OpenWakeWordJS extends EventEmitter {
    // Public access to nodes for inspection/debugging
    public source: MicrophoneNode;
    public vad: VadNode;
    public vadState: VadStateNode;
    public features: FeatureNode;
    public keywords: KeywordNode;
    public sink: CallbackNode<Detection[]>;
    
    // Logic State
    public cooldownMs: number;
    private _isCoolingDown: boolean;
    private _statsTimer: any = null;

    constructor({
        // Microphone
        sampleRate = 16000,
        frameSize = 1280,

        // VAD
        vadModelPath,
        vadHangoverFrames = 12,
        
        // Features
        melModelPath,
        embeddingModelPath,
        
        // Keywords
        models,
        threshold = 0.5,
        cooldownMs = 2000,
        
        // Global
        executionProviders = ['wasm'],
        wasmPaths = "./onnx/"
    }: OpenWakeWordJSOptions) {
        super();
        this.cooldownMs = cooldownMs;
        this._isCoolingDown = false;
        env.wasm.wasmPaths = wasmPaths;

        // 1. Instantiate Nodes
        this.source = new MicrophoneNode("Microphone", sampleRate);
        this.vad = new VadNode("Vad", vadModelPath, executionProviders);
        this.vadState = new VadStateNode("VadState", vadHangoverFrames);
        this.features = new FeatureNode(
            "Feature", 
            melModelPath, 
            embeddingModelPath, 
            executionProviders, 
            frameSize
        );
        this.keywords = new KeywordNode("Keywords", models, executionProviders, threshold);

        // 2. The Sink Logic
        this.sink = new CallbackNode("Output", (detections: Detection[]) => {
            // Access VAD state directly from the node's public getter
            const isSpeech = this.vadState.isSpeechActive;

            if (isSpeech && !this._isCoolingDown) {
                detections.forEach(d => this.emit('detect', d));
                this._triggerCooldown();
            }
        });

        // 3. Connect the Graph
        this.source
            .to(this.vad)
            .to(this.vadState)
            .to(this.features)
            .to(this.keywords)
            .to(this.sink);
    }

    /**
     * Start the engine (starts microphone flow)
     */
    public async start(deviceId?: string): Promise<void> {
        // Reset all nodes to clear buffers/state from previous runs
        // We iterate backwards or just reset the source which cascades? 
        // With the new system, resetting source is usually enough, 
        // but explicit reset ensures clean stats.
        this.source.reset(); 
        this.vad.reset();
        this.vadState.reset();
        this.features.reset();
        this.keywords.reset();
        this.sink.reset();

        await this.source.start(deviceId);
        this.emit('ready');
    }

    /**
     * Stop the engine
     */
    public async stop(): Promise<void> {
        await this.source.stop();
    }

    /**
     * Helper to retrieve the raw HTML graph string immediately
     */
    public toDownStream(): string {
        return this.source.toDownStream();
    }

    private _triggerCooldown(): void {
        this._isCoolingDown = true;
        setTimeout(() => { this._isCoolingDown = false; }, this.cooldownMs);
    }
}