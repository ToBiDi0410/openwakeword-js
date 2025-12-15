export interface AudioFrame {
    id: number;
    raw: Float32Array;
    sampleRate: number;
    // Added by VadGenerator
    vadConfidence?: number;
    isSpeech?: boolean;
    // Added by VadStateGenerator
    isSpeechSmoothed?: boolean;
    // Added by FeatureGenerator
    embedding?: Float32Array;
}

export interface Detection {
    keyword: string;
    score: number;
    timestamp: number;
}