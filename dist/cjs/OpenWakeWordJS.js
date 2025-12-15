"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenWakeWordJS = void 0;
const onnxruntime_web_1 = require("onnxruntime-web");
const MicrophoneNode_1 = require("./nodes/MicrophoneNode");
const VadNode_1 = require("./nodes/VadNode");
const VadStateNode_1 = require("./nodes/VadStateNode");
const FeatureNode_1 = require("./nodes/FeatureNode");
const KeywordNode_1 = require("./nodes/KeywordNode");
const CallbackNode_1 = require("./nodes/CallbackNode");
const EventEmitter_1 = require("./core/EventEmitter");
class OpenWakeWordJS extends EventEmitter_1.EventEmitter {
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
        onnxruntime_web_1.env.wasm.wasmPaths = wasmPaths;
        // 1. Instantiate Nodes
        this.source = new MicrophoneNode_1.MicrophoneNode("Microphone", sampleRate);
        this.vad = new VadNode_1.VadNode("Vad", vadModelPath, executionProviders);
        this.vadState = new VadStateNode_1.VadStateNode("VadState", vadHangoverFrames);
        this.features = new FeatureNode_1.FeatureNode("Feature", melModelPath, embeddingModelPath, executionProviders, frameSize);
        this.keywords = new KeywordNode_1.KeywordNode("Keywords", models, executionProviders, threshold);
        // 2. The Sink Logic
        this.sink = new CallbackNode_1.CallbackNode("Output", (detections) => {
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
exports.OpenWakeWordJS = OpenWakeWordJS;
