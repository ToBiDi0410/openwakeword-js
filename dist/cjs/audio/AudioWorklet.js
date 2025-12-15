"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUDIO_PROCESSOR_CODE = exports.PROCESSOR_NAME = void 0;
exports.PROCESSOR_NAME = 'audio-processor';
exports.AUDIO_PROCESSOR_CODE = `
class AudioProcessor extends AudioWorkletProcessor {
    bufferSize = 1280;
    _buffer = new Float32Array(this.bufferSize);
    _pos = 0;
    
    process(inputs) {
        const input = inputs[0][0];
        if (input) {
            for (let i = 0; i < input.length; i++) {
                this._buffer[this._pos++] = input[i];
                if (this._pos === this.bufferSize) {
                    this.port.postMessage(this._buffer);
                    this._pos = 0;
                }
            }
        }
        return true;
    }
}
registerProcessor('${exports.PROCESSOR_NAME}', AudioProcessor);
`;
