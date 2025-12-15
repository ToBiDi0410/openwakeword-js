import { DynamicNode } from '../core/DynamicNode';
import { AudioFrame } from '../core/interfaces';
interface MicrophoneGlobalState {
    audioContext: AudioContext | null;
    mediaStream: MediaStream | null;
    workletNode: AudioWorkletNode | null;
}
export declare class MicrophoneNode extends DynamicNode<void, AudioFrame, MicrophoneGlobalState> {
    sampleRate: number;
    protected inputAmount: number;
    constructor(name?: string, sampleRate?: number);
    /**
     * Explicit start method required for Source Nodes to begin pumping data.
     */
    start(deviceId?: string): Promise<void>;
    /**
     * Manual Stop
     */
    stop(): Promise<void>;
    /**
     * Override Reset to clean up hardware first
     */
    reset(): void;
    /**
     * Source nodes don't pull from upstream, so this is a no-op.
     */
    protected run(data: void[]): Promise<void>;
}
export {};
