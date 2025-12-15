import { DynamicNode } from '../core/DynamicNode';
import { AudioFrame } from '../core/interfaces';

// Define the persistent state
interface VadStateGlobal {
    currentHangover: number;
    isSpeechActive: boolean;
}

export class VadStateNode extends DynamicNode<AudioFrame, AudioFrame, VadStateGlobal> {
    public hangoverFrames: number;

    // Process 1 frame at a time
    protected inputAmount = 1;

    /**
     * @param {number} hangoverFrames - How many frames to wait before switching silence.
     */
    constructor(name: string, hangoverFrames: number = 10) {
        // Initialize state to "Silence"
        super(name, {
            currentHangover: 0,
            isSpeechActive: false
        });
        
        this.hangoverFrames = hangoverFrames;
    }

    /**
     * Public getter to expose state to the external Engine/UI.
     * Reads directly from the current global state.
     */
    get isSpeechActive(): boolean {
        return this.globalState.isSpeechActive;
    }

    protected async run(data: AudioFrame[]): Promise<void> {
        const frame = data[0];

        // 1. Check the raw VAD decision from the previous node (VadGenerator)
        if (frame.isSpeech) {
            // Speech detected -> Reset countdown, mark active
            this.globalState.isSpeechActive = true;
            this.globalState.currentHangover = this.hangoverFrames;
        } else if (this.globalState.isSpeechActive) {
            // Silence detected BUT we are currently active -> Decrement countdown
            this.globalState.currentHangover--;
            
            // If countdown hits zero, finally switch to silence
            if (this.globalState.currentHangover <= 0) {
                this.globalState.isSpeechActive = false;
            }
        }

        // 2. Attach the smoothed state to the frame
        // This is what downstream nodes (like FeatureGenerator or WakeWord) should rely on
        frame.isSpeechSmoothed = this.globalState.isSpeechActive;
        
        // 3. Pass it on
        this.push(frame);
    }
}