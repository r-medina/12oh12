import * as Tone from 'tone';

/**
 * A Master bus processing chain that emulates some characteristics of vintage tape/analog gear.
 * It includes:
 * 1. Multiband Compression (simulated via standard compressor for glue)
 * 2. Subtle Saturation (Distortion)
 * 3. Warmth Filter (Lowpass)
 */
// Use static URL for the processor in public folder.
// Bypasses Vite bundling issues for AudioWorklet + WASM.
// Add timestamp to burst cache
const tapeProcessorUrl = '/tape-processor.js?t=' + Date.now();

export class TapeChain {
  public input: Tone.Gain;
  public output: Tone.Gain;
  
  private isBypassed: boolean = false;

  private compressor: Tone.Compressor;
  private distortion: Tone.Distortion;
  private filter: Tone.Filter;

  constructor() {
    this.input = new Tone.Gain(1);
    this.output = new Tone.Gain(1);

    // 1. Compressor: Acts as "glue" for the mix
    // Moderate attack to let transients punch, slower release to smooth it out.
    // Ratio 2:1 is gentle.
    this.compressor = new Tone.Compressor({
      threshold: -20,
      ratio: 2,
      attack: 0.01,
      release: 0.2,
      knee: 5,
    });

    // 2. Distortion: Very subtle saturation
    // 0.05 is just enough to add harmonics without sounding "distorted"
    this.distortion = new Tone.Distortion({
      distortion: 0.05,
      oversample: '2x', // Better quality
    });

    // 3. Filter: Roll off extreme highs for that "warm" tape sound
    // 18kHz is a gentle roll-off, not muffled.
    this.filter = new Tone.Filter({
      type: "lowpass",
      frequency: 19000,
      rolloff: -12,
      Q: 0.5
    });

    // Connect the chain
    // Default: input -> output (dry) until WASM loads or if bypassed
    this.input.connect(this.output);
  }

  public async init() {
    if (this.isBypassed) return;

    try {
        console.log('Initializing WASM Tape Processor...');
        
        // Fetch the WASM binary on the main thread
        const wasmResponse = await fetch('/wasm-dsp/wasm_dsp_bg.wasm');
        const wasmBytes = await wasmResponse.arrayBuffer();
        
        console.log('WASM binary loaded, size:', wasmBytes.byteLength);
        
        // Load the AudioWorklet processor
        await Tone.getContext().rawContext.audioWorklet.addModule(tapeProcessorUrl);
        
        // Create the AudioWorkletNode
        const wasmNode = new AudioWorkletNode(
            Tone.getContext().rawContext,
            'tape-processor'
        );
        
        // Send the WASM bytes to the worklet for initialization
        wasmNode.port.postMessage({
            type: 'init-wasm',
            wasmBytes: wasmBytes
        }, [wasmBytes]); // Transfer ownership for zero-copy
        
        // Wait for WASM to be ready in the worklet
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('WASM init timeout'));
            }, 5000);
            
            wasmNode.port.onmessage = (event) => {
                if (event.data.type === 'ready') {
                    clearTimeout(timeout);
                    console.log('WASM Tape Processor ready');
                    resolve();
                } else if (event.data.type === 'error') {
                    clearTimeout(timeout);
                    reject(new Error(event.data.error));
                }
            };
        });
        
        // Connect: input -> WASM -> output
        // Tone.js nodes can connect to native Web Audio nodes directly
        this.input.disconnect();
        this.input.connect(wasmNode as any);
        (wasmNode as any).connect(this.output);
        
        console.log('Tape Processor Loaded (WASM mode)');
    } catch (e) {
        console.warn('Failed to load WASM Tape Processor, falling back to Tone.js:', e);
        
        // Fallback to Tone.js effects chain
        this.input.disconnect();
        this.input.chain(this.distortion, this.compressor, this.filter, this.output);
        console.log('Tape Processor Loaded (Tone.js fallback mode)');
    }
  }

  // Method to bypass if needed
  public setBypass(bypass: boolean) {
    if (bypass) {
        this.input.disconnect();
        this.input.connect(this.output);
    } else {
        this.input.disconnect();
        this.input.chain(this.distortion, this.compressor, this.filter, this.output);
    }
  }

  // Pro Mode Controls
  public setCompressorThreshold(val: number) {
    this.compressor.threshold.value = val;
  }

  public setCompressorRatio(val: number) {
    this.compressor.ratio.value = val;
  }

  public setCompressorAttack(val: number) {
    this.compressor.attack.value = val;
  }

  public setCompressorRelease(val: number) {
    this.compressor.release.value = val;
  }

  public setDistortion(val: number) {
    this.distortion.distortion = val;
  }

  public setFilterCutoff(val: number) {
    this.filter.frequency.value = val;
  }
}
