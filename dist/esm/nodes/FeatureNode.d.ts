import * as ort from 'onnxruntime-web';
import { DynamicNode } from '../core/DynamicNode';
import { AudioFrame } from '../core/interfaces';
interface FeatureGlobalState {
    melSession: ort.InferenceSession | null;
    embeddingSession: ort.InferenceSession | null;
    melBuffer: Float32Array[];
}
export declare class FeatureNode extends DynamicNode<AudioFrame, AudioFrame, FeatureGlobalState> {
    melPath: string;
    embeddingPath: string;
    executionProviders: string[];
    frameSize: number;
    protected inputAmount: number;
    constructor(name: string, melPath: string, embeddingPath: string, executionProviders?: string[], frameSize?: number);
    /**
     * Internal helper to load models if they aren't ready.
     */
    private ensureInitialized;
    /**
     * Main processing logic.
     * Guaranteed to receive exactly 1 AudioFrame in 'data'.
     */
    protected run(data: AudioFrame[]): Promise<void>;
}
export {};
