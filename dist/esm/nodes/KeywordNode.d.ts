import * as ort from 'onnxruntime-web';
import { DynamicNode } from '../core/DynamicNode';
import { AudioFrame, Detection } from '../core/interfaces';
declare class KeywordModel {
    session: ort.InferenceSession;
    windowSize: number;
    history: Float32Array[];
    constructor(session: ort.InferenceSession, windowSize: number);
    resetHistory(): void;
    predict(embedding: Float32Array): Promise<number>;
}
interface KeywordGlobalState {
    models: Map<string, KeywordModel>;
    activeKeywords: Set<string>;
    initialized: boolean;
}
export declare class KeywordNode extends DynamicNode<AudioFrame, Detection[], KeywordGlobalState> {
    modelsConfig: string[][];
    executionProviders: string[];
    threshold: number;
    protected inputAmount: number;
    constructor(name: string, models: string[][], executionProviders?: string[], threshold?: number);
    /**
     * Internal helper to load all configured models
     */
    private ensureInitialized;
    protected run(data: AudioFrame[]): Promise<void>;
}
export {};
