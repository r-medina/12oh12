import * as Tone from 'tone';

/**
 * A Master bus processing chain that emulates some characteristics of vintage tape/analog gear.
 * It includes:
 * 1. Multiband Compression (simulated via standard compressor for glue)
 * 2. Subtle Saturation (Distortion)
 * 3. Warmth Filter (Lowpass)
 */
export class TapeChain {
  public input: Tone.Gain;
  public output: Tone.Gain;

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
      frequency: 18000,
      rolloff: -12,
      Q: 0.5
    });

    // Connect the chain
    // input -> distortion -> compressor -> filter -> output
    // (Order is subjective, but saturation -> compression is common for "tape" simulation where tape saturates then limits)
    this.input.chain(this.distortion, this.compressor, this.filter, this.output);
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
}
