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
exports.VadNode = void 0;
const ort = __importStar(require("onnxruntime-web"));
const DynamicNode_1 = require("../core/DynamicNode");
class VadNode extends DynamicNode_1.DynamicNode {
    constructor(name, modelPath, executionProviders = ['wasm']) {
        // Initialize state as empty/null. 
        // DynamicNode.reset() will revert to this structure.
        super(name, {
            session: null,
            h: null,
            c: null
        });
        // Process 1 frame at a time
        this.inputAmount = 1;
        this.modelPath = modelPath;
        this.executionProviders = executionProviders;
    }
    /**
     * Initializes the ONNX session if needed.
     * Also resets/initializes the Context Tensors (h and c) if they are missing.
     */
    async ensureInitialized() {
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
    resetContextTensors() {
        const zeros = new Float32Array(2 * 1 * 64).fill(0);
        this.globalState.h = new ort.Tensor('float32', zeros, [2, 1, 64]);
        this.globalState.c = new ort.Tensor('float32', zeros, [2, 1, 64]);
    }
    async run(data) {
        // 1. Lazy Init
        await this.ensureInitialized();
        const frame = data[0];
        const session = this.globalState.session; // Non-null assertion after ensureInitialized
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
            h: this.globalState.h,
            c: this.globalState.c
        });
        // 4. Update Context for next frame
        this.globalState.h = res.hn;
        this.globalState.c = res.cn;
        // 5. Update Frame Data
        // Output is a single probability value [0..1]
        frame.vadConfidence = res.output.data[0];
        frame.isSpeech = frame.vadConfidence > 0.5;
        // 6. Push to next node
        this.push(frame);
    }
}
exports.VadNode = VadNode;
