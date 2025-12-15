import * as ort from 'onnxruntime-web';
import { DynamicNode } from '../core/DynamicNode';
import { AudioFrame } from '../core/interfaces';
interface VadGlobalState {
    session: ort.InferenceSession | null;
    h: ort.Tensor | null;
    c: ort.Tensor | null;
}
export declare class VadNode extends DynamicNode<AudioFrame, AudioFrame, VadGlobalState> {
    modelPath: string;
    executionProviders: string[];
    protected inputAmount: number;
    constructor(name: string, modelPath: string, executionProviders?: string[]);
    /**
     * Initializes the ONNX session if needed.
     * Also resets/initializes the Context Tensors (h and c) if they are missing.
     */
    private ensureInitialized;
    /**
     * Helper to zero out the VAD context (effectively forgetting previous audio).
     */
    private resetContextTensors;
    protected run(data: AudioFrame[]): Promise<void>;
}
export {};
