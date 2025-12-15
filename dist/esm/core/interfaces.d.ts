export interface AudioFrame {
    id: number;
    raw: Float32Array;
    sampleRate: number;
    vadConfidence?: number;
    isSpeech?: boolean;
    isSpeechSmoothed?: boolean;
    embedding?: Float32Array;
}
export interface Detection {
    keyword: string;
    score: number;
    timestamp: number;
}
