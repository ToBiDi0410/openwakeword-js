import { env } from 'onnxruntime-web';
import { MicrophoneNode } from './nodes/MicrophoneNode';
import { VadNode } from './nodes/VadNode';
import { VadStateNode } from './nodes/VadStateNode';
import { FeatureNode } from './nodes/FeatureNode';
import { KeywordNode } from './nodes/KeywordNode';
import { CallbackNode } from './nodes/CallbackNode';
import { EventEmitter } from './core/EventEmitter';
export class OpenWakeWordJS extends EventEmitter {
    constructor({ 
    // Microphone
    sampleRate = 16000, frameSize = 1280, 
    // VAD
    vadModelPath, vadHangoverFrames = 12, 
    // Features
    melModelPath, embeddingModelPath, 
    // Keywords
    models, threshold = 0.5, cooldownMs = 2000, 
    // Global
    executionProviders = ['wasm'], wasmPaths = "./onnx/" }) {
        super();
        this._statsTimer = null;
        this.cooldownMs = cooldownMs;
        this._isCoolingDown = false;
        env.wasm.wasmPaths = wasmPaths;
        // 1. Instantiate Nodes
        this.source = new MicrophoneNode("Microphone", sampleRate);
        this.vad = new VadNode("Vad", vadModelPath, executionProviders);
        this.vadState = new VadStateNode("VadState", vadHangoverFrames);
        this.features = new FeatureNode("Feature", melModelPath, embeddingModelPath, executionProviders, frameSize);
        this.keywords = new KeywordNode("Keywords", models, executionProviders, threshold);
        // 2. The Sink Logic
        this.sink = new CallbackNode("Output", (detections) => {
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
    async start(deviceId) {
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
    async stop() {
        await this.source.stop();
    }
    /**
     * Helper to retrieve the raw HTML graph string immediately
     */
    toDownStream() {
        return this.source.toDownStream();
    }
    _triggerCooldown() {
        this._isCoolingDown = true;
        setTimeout(() => { this._isCoolingDown = false; }, this.cooldownMs);
    }
}
