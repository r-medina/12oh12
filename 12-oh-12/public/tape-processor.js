console.log("TapeProcessorWorklet: Script execution started");

// Import WASM bindings (will be loaded via importScripts)
importScripts("/wasm-bindings.js");

// WASM instance and processor
let wasm = null;
let TapeProcessor = null;

class TapeProcessorWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.processor = null;
    this.isReady = false;
    this.port.onmessage = this.handleMessage.bind(this);
  }

  async handleMessage(event) {
    if (event.data.type === "init-wasm") {
      try {
        const wasmBytes = event.data.wasmBytes;
        console.log("Worklet received WASM bytes, size:", wasmBytes.byteLength);

        // Initialize WASM using the imported bindings
        // The wasm-bindings.js exports initSync function
        const wasmModule = await WebAssembly.compile(wasmBytes);
        const instance = await initSync(wasmModule);

        // Create processor instance
        this.processor = new window.TapeProcessor();
        this.isReady = true;

        console.log("TapeProcessorWorklet: WASM initialized successfully");
        this.port.postMessage({ type: "ready" });
      } catch (e) {
        console.error("TapeProcessorWorklet: WASM init failed:", e);
        this.port.postMessage({ type: "error", error: String(e) });
      }
    }
  }

  process(inputs, outputs, _parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input[0] || !output || !output[0]) return true;

    // Passthrough until WASM is ready
    if (!this.isReady || !this.processor) {
      for (let channel = 0; channel < output.length; channel++) {
        if (input[channel]) {
          output[channel].set(input[channel]);
        }
      }
      return true;
    }

    // Process using WASM - optimized block processing
    for (let channel = 0; channel < output.length; channel++) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];

      if (inputChannel) {
        // Copy input to output buffer
        outputChannel.set(inputChannel);

        // Process in-place - WASM operates directly on the Float32Array
        try {
          this.processor.process(outputChannel);
        } catch (e) {
          console.error("TapeProcessorWorklet: Processing error:", e);
          this.isReady = false;
        }
      }
    }

    return true;
  }
}

registerProcessor("tape-processor", TapeProcessorWorklet);
console.log("TapeProcessorWorklet: Registered 'tape-processor'");
