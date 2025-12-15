import { DynamicNode } from '../core/DynamicNode';
import { AudioFrame } from '../core/interfaces';
interface VadStateGlobal {
    currentHangover: number;
    isSpeechActive: boolean;
}
export declare class VadStateNode extends DynamicNode<AudioFrame, AudioFrame, VadStateGlobal> {
    hangoverFrames: number;
    protected inputAmount: number;
    /**
     * @param {number} hangoverFrames - How many frames to wait before switching silence.
     */
    constructor(name: string, hangoverFrames?: number);
    /**
     * Public getter to expose state to the external Engine/UI.
     * Reads directly from the current global state.
     */
    get isSpeechActive(): boolean;
    protected run(data: AudioFrame[]): Promise<void>;
}
export {};
