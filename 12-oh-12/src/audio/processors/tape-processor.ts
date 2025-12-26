// Import the WASM init function and class from the generated pkg
// Vite will bundle this JS.
import init, { TapeProcessor } from '../wasm-dsp/pkg/wasm_dsp.js';


// Declarations for AudioWorklet globals which are not in the DOM lib by default
declare class AudioWorkletProcessor {
  port: MessagePort;
  constructor(options?: any);
  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
}

declare function registerProcessor(name: string, processorCtor: any): void;

class TapeProcessorWorklet extends AudioWorkletProcessor {
  private processor: TapeProcessor | null = null;
  private isReady: boolean = false;

  constructor() {
    super();
    this.port.onmessage = this.handleMessage.bind(this);
    // Don't auto-init, wait for main thread to send compiled WASM
  }

  async initWasm(wasmModule: WebAssembly.Module) {
    try {
      // Initialize WASM with the pre-compiled module from main thread
      await init(wasmModule);
      this.processor = new TapeProcessor();
      this.isReady = true;
      this.port.postMessage({ type: 'ready' });
    } catch (e) {
      console.error('Failed to load WASM in AudioWorklet', e);
      this.port.postMessage({ type: 'error', error: String(e) });
    }
  }

  handleMessage(event: MessageEvent) {
    // Handle WASM initialization from main thread
    if (event.data.type === 'init-wasm') {
      this.initWasm(event.data.wasmModule);
      return;
    }
    
    // Handle params in future
    if (event.data.type === 'param') {
       console.log('Param received', event.data);
    }
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][], _parameters: Record<string, Float32Array>): boolean {
    const input = inputs[0];
    const output = outputs[0];

    // If no input or no output, keep alive but do nothing
    if (!input || !input[0] || !output || !output[0]) return true;

    // Passthrough until ready
    if (!this.isReady || !this.processor) {
      // Copy input to output
      for (let channel = 0; channel < output.length; channel++) {
         if (input[channel]) {
             output[channel].set(input[channel]);
         }
      }
      return true;
    }

    // Process using WASM
    // Currently our Rust processor handles one buffer at a time (mono)
    // We should process each channel.
    for (let channel = 0; channel < output.length; channel++) {
        const inputChannel = input[channel];
        const outputChannel = output[channel];
        
        if (inputChannel) {
             // Copy input to output first (so we can process in-place on output buffer)
             // OR Copy input to output, then pass output slice to WASM.
             outputChannel.set(inputChannel);
             
             // Process in-place
             try {
                this.processor.process(outputChannel);
             } catch (e) {
                // If WASM crashes, fallback?
             }
        }
    }

    return true;
  }
}

registerProcessor('tape-processor', TapeProcessorWorklet);
