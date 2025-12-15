# OpenWakeWord JS (Graph-Based)

> [!CAUTION]  
> This project is not actively maintained!   
> Contributions are welcomed!

A high-performance, event-driven implementation of [OpenWakeWord](https://github.com/dscripka/openWakeWord) for the web and Node.js, built on **ONNX Runtime**.

This library allows you to run robust wake word detection (e.g., "Hey Jarvis") entirely client-side using WebAssembly, with a novel **Graph/Node Architecture** that handles backpressure, buffering, and state management efficiently.

# 🛠 Usage
You can use this package without building by including the files in the dist branch via CDN!   
```
//Minimal Usage example
//Replace URLs with CDN URLs!

<script src="/browser.js"></script>
<script>
    const engine = new WakeWordEngine({
        vadModelPath: "..../silero_vad.onnx",
        melModelPath: "..../melspectrogram.onnx",
        embeddingModelPath: "..../embedding_model.onnx",
        models: [
            ['alexa', '..../alexa_v0.1.onnx']
        ],
        statsInterval: 1000
    });

    engine.on('detect', (evt) => {
        console.log(`🎯 Detected: "${evt.keyword}" (Score: ${evt.score.toFixed(2)})`, 'success');
        document.body.innerHTML += "<a>DETECTED</a><br>";  
    });

    engine.start();
</script>
```

# 📝License & Attribution
- [Open Wake Word on the Web](https://deepcorelabs.com/open-wake-word-on-the-web/) - by  Miro Hristov
- [dnavarrom/openwakeword_wasm](https://github.com/dnavarrom/openwakeword_wasm) - by dnavarrom
- [Microsoft/onnxruntime](https://github.com/Microsoft/onnxruntime) — by Microsoft — [MIT](https://opensource.org/licenses/MIT)
- [parcel](https://github.com/parcel-bundler/parcel) — by Parcel-Bundler — [MIT](https://opensource.org/licenses/MIT)