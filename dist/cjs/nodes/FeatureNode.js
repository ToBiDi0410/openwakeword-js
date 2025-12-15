"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureNode = void 0;
const ort = __importStar(require("onnxruntime-web"));
const DynamicNode_1 = require("../core/DynamicNode");
class FeatureNode extends DynamicNode_1.DynamicNode {
    constructor(name, melPath, embeddingPath, executionProviders = ['wasm'], frameSize = 1280) {
        // Initialize global state with empty/null values
        super(name, {
            melSession: null,
            embeddingSession: null,
            melBuffer: []
        });
        // We process 1 audio frame at a time
        this.inputAmount = 1;
        this.melPath = melPath;
        this.embeddingPath = embeddingPath;
        this.executionProviders = executionProviders;
        this.frameSize = frameSize;
    }
    /**
     * Internal helper to load models if they aren't ready.
     */
    async ensureInitialized() {
        if (this.globalState.melSession && this.globalState.embeddingSession) {
            return;
        }
        console.log(`[${this.name}] Loading ONNX models...`);
        const opts = { executionProviders: this.executionProviders };
        const [mel, embed] = await Promise.all([
            ort.InferenceSession.create(this.melPath, opts),
            ort.InferenceSession.create(this.embeddingPath, opts)
        ]);
        this.globalState.melSession = mel;
        this.globalState.embeddingSession = embed;
        console.log(`[${this.name}] Models loaded.`);
    }
    /**
     * Main processing logic.
     * Guaranteed to receive exactly 1 AudioFrame in 'data'.
     */
    async run(data) {
        // 1. Lazy Initialization
        await this.ensureInitialized();
        // We know these exist now, but TypeScript might need a check or non-null assertion
        const melSession = this.globalState.melSession;
        const embedSession = this.globalState.embeddingSession;
        const frame = data[0];
        // 2. Validation
        if (frame.raw.length !== this.frameSize) {
            console.warn(`[${this.name}] Frame size mismatch! Expected ${this.frameSize}, got ${frame.raw.length}`);
            return;
        }
        // 3. Mel Spectrogram Inference
        // 
        const melspecTensor = new ort.Tensor('float32', frame.raw, [1, this.frameSize]);
        const melOut = await melSession.run({
            [melSession.inputNames[0]]: melspecTensor
        });
        const newMelData = melOut[melSession.outputNames[0]].data;
        // 4. Normalization
        for (let j = 0; j < newMelData.length; j++) {
            newMelData[j] = newMelData[j] / 10.0 + 2.0;
        }
        // 5. Buffer Management (Add to Global State)
        // Assumes model outputs 5 sub-frames per 1280 input
        for (let j = 0; j < 5; j++) {
            const start = j * 32;
            const end = (j + 1) * 32;
            this.globalState.melBuffer.push(new Float32Array(newMelData.slice(start, end)));
        }
        // 6. Embedding Inference (Window of 76 frames)
        if (this.globalState.melBuffer.length >= 76) {
            // Slice the window
            const windowFrames = this.globalState.melBuffer.slice(0, 76);
            // Flatten
            const flattenedMel = new Float32Array(76 * 32);
            for (let j = 0; j < windowFrames.length; j++) {
                flattenedMel.set(windowFrames[j], j * 32);
            }
            // Run Embedding Model
            const embedOut = await embedSession.run({
                [embedSession.inputNames[0]]: new ort.Tensor('float32', flattenedMel, [1, 76, 32, 1])
            });
            // Slide the window (Remove 8 oldest frames)
            this.globalState.melBuffer.splice(0, 8);
            // Attach result and Push to Output Buffer
            frame.embedding = embedOut[embedSession.outputNames[0]].data;
            this.push(frame);
        }
    }
}
exports.FeatureNode = FeatureNode;
