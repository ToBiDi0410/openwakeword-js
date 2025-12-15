import { MicrophoneNode } from './nodes/MicrophoneNode';
import { VadNode } from './nodes/VadNode';
import { VadStateNode } from './nodes/VadStateNode';
import { FeatureNode } from './nodes/FeatureNode';
import { KeywordNode } from './nodes/KeywordNode';
import { CallbackNode } from './nodes/CallbackNode';
import { Detection } from './core/interfaces';
import { EventEmitter } from './core/EventEmitter';
export interface OpenWakeWordJSOptions {
    sampleRate?: number;
    frameSize?: number;
    vadModelPath: string;
    vadHangoverFrames?: number;
    melModelPath: string;
    embeddingModelPath: string;
    models: string[][];
    threshold?: number;
    cooldownMs?: number;
    executionProviders?: string[];
    wasmPaths?: string | Record<string, string>;
}
export declare class OpenWakeWordJS extends EventEmitter {
    source: MicrophoneNode;
    vad: VadNode;
    vadState: VadStateNode;
    features: FeatureNode;
    keywords: KeywordNode;
    sink: CallbackNode<Detection[]>;
    cooldownMs: number;
    private _isCoolingDown;
    private _statsTimer;
    constructor({ sampleRate, frameSize, vadModelPath, vadHangoverFrames, melModelPath, embeddingModelPath, models, threshold, cooldownMs, executionProviders, wasmPaths }: OpenWakeWordJSOptions);
    /**
     * Start the engine (starts microphone flow)
     */
    start(deviceId?: string): Promise<void>;
    /**
     * Stop the engine
     */
    stop(): Promise<void>;
    /**
     * Helper to retrieve the raw HTML graph string immediately
     */
    toDownStream(): string;
    private _triggerCooldown;
}
