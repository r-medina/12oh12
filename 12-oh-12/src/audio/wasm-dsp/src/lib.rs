use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct TapeProcessor {
    // Simple stateful DSP parameters
    // We'll implement a simple tape saturation + filter without FunDSP overhead
    filter_state: f32,
}

#[wasm_bindgen]
impl TapeProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> TapeProcessor {
        TapeProcessor {
            filter_state: 0.0,
        }
    }

    /// Process audio buffer in-place
    /// This is the main processing function called from AudioWorklet
    pub fn process(&mut self, data: &mut [f32]) {
        // Process entire block at once - no per-sample overhead
        for sample in data.iter_mut() {
            *sample = self.process_sample(*sample);
        }
    }

    /// Process a single sample through the tape chain
    /// Tape Chain:
    /// 1. Drive/Saturation (tanh)
    /// 2. Warmth Filter (simple 1-pole lowpass ~18kHz at 48kHz)
    #[inline]
    fn process_sample(&mut self, input: f32) -> f32 {
        // 1. Saturation: Drive * 1.5 then tanh
        let driven = input * 1.5;
        let saturated = driven.tanh();
        
        // 2. Simple 1-pole lowpass filter for warmth
        // Coefficient for ~18kHz cutoff at 48kHz sample rate
        // fc = 18000, fs = 48000
        // a = 1 / (1 + 2*pi*fc/fs) ≈ 0.19
        let a = 0.19;
        self.filter_state = a * saturated + (1.0 - a) * self.filter_state;
        
        // 3. Soft limiting (simple tanh again at lower drive)
        let limited = self.filter_state * 0.9;
        limited.tanh()
    }

    /// Get pointer to WASM memory for zero-copy access
    /// This allows the AudioWorklet to write directly to WASM memory
    #[wasm_bindgen]
    pub fn get_buffer_ptr(&self) -> *const f32 {
        // This will be used for SharedArrayBuffer approach
        std::ptr::null()
    }
}
