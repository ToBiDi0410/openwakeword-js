import { DynamicNode } from '../core/DynamicNode';
import { AudioFrame } from '../core/interfaces';
import { AUDIO_PROCESSOR_CODE, PROCESSOR_NAME } from '../audio/AudioWorklet'; 

// Define the persistent resources for the microphone
interface MicrophoneGlobalState {
    audioContext: AudioContext | null;
    mediaStream: MediaStream | null;
    workletNode: AudioWorkletNode | null;
}

export class MicrophoneNode extends DynamicNode<void, AudioFrame, MicrophoneGlobalState> {
    public sampleRate: number;
    
    // Source nodes consume 0 inputs from upstream
    protected inputAmount = 0; 

    constructor(name: string = 'Microphone', sampleRate: number = 16000) {
        super(name, {
            audioContext: null,
            mediaStream: null,
            workletNode: null
        });
        this.sampleRate = sampleRate;
    }

    /**
     * Explicit start method required for Source Nodes to begin pumping data.
     */
    async start(deviceId?: string): Promise<void> {
        // Prevent double-start
        if (this.globalState.audioContext?.state === 'running') return;

        try {
            console.log(`[${this.name}] Requesting microphone access...`);

            // 1. Get Hardware Stream
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: deviceId ? { deviceId: { exact: deviceId } } : true
            });

            // 2. Setup Audio Context
            const ctx = new AudioContext({ sampleRate: this.sampleRate });
            const source = ctx.createMediaStreamSource(stream);

            // 3. Setup Worklet Processor
            const blob = new Blob([AUDIO_PROCESSOR_CODE], { type: 'application/javascript' });
            await ctx.audioWorklet.addModule(URL.createObjectURL(blob));

            const worklet = new AudioWorkletNode(ctx, PROCESSOR_NAME);

            // 4. The Data Pump
            // This is where the hardware event loop bridges into our Node System
            worklet.port.onmessage = (event: MessageEvent) => {
                if (!event.data) return;
                
                // 
                const frame: AudioFrame = {
                    id: performance.now(),
                    raw: event.data as Float32Array,
                    sampleRate: this.sampleRate
                };

                // Inject into the system!
                // This adds to outputBuffer and triggers nextNodes.tryRun()
                this.push(frame); 
            };

            // 5. Connect Graph
            source.connect(worklet);
            worklet.connect(ctx.destination); // Keep alive

            // 6. Save State
            this.globalState.mediaStream = stream;
            this.globalState.audioContext = ctx;
            this.globalState.workletNode = worklet;

            console.log(`[${this.name}] Started @ ${this.sampleRate}Hz`);

        } catch (err: any) {
            // Manually trigger error state since we aren't inside tryRun()
            this.isErrored = true;
            this.error = {
                message: err.message || String(err),
                timestamp: new Date(),
                originalError: err
            };
            console.error(`[${this.name}] Failed to start:`, err);
        }
    }

    /**
     * Manual Stop
     */
    async stop(): Promise<void> {
        if (this.globalState.workletNode) {
            this.globalState.workletNode.port.onmessage = null;
            this.globalState.workletNode.disconnect();
        }

        if (this.globalState.audioContext) {
            await this.globalState.audioContext.close();
        }

        if (this.globalState.mediaStream) {
            this.globalState.mediaStream.getTracks().forEach(t => t.stop());
        }

        // Clear references
        this.globalState.audioContext = null;
        this.globalState.mediaStream = null;
        this.globalState.workletNode = null;
        
        console.log(`[${this.name}] Stopped.`);
    }

    /**
     * Override Reset to clean up hardware first
     */
    public reset(): void {
        // Ensure we stop the hardware before wiping the state object
        this.stop().then(() => {
            super.reset();
        });
    }

    /**
     * Source nodes don't pull from upstream, so this is a no-op.
     */
    protected async run(data: void[]): Promise<void> {
        // Intentionally empty
    }
}