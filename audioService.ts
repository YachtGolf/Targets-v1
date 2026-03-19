class AudioService {
  private sfxEnabled: boolean = true;
  private musicEnabled: boolean = true;
  private audioCtx: AudioContext | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private themeGain: GainNode | null = null;
  private themeBuffer: AudioBuffer | null = null;
  private themeSource: AudioBufferSourceNode | null = null;
  private themeStarted: boolean = false;

  constructor() {
    const sfx = localStorage.getItem('sfx_enabled');
    const music = localStorage.getItem('music_enabled');
    this.sfxEnabled = sfx !== null ? sfx === 'true' : true;
    this.musicEnabled = music !== null ? music === 'true' : true;
  }

  private initContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a master compressor to prevent digital clipping/crackling
      this.masterCompressor = this.audioCtx.createDynamicsCompressor();
      this.masterCompressor.threshold.setValueAtTime(-20, this.audioCtx.currentTime);
      this.masterCompressor.knee.setValueAtTime(30, this.audioCtx.currentTime);
      this.masterCompressor.ratio.setValueAtTime(12, this.audioCtx.currentTime);
      this.masterCompressor.attack.setValueAtTime(0.003, this.audioCtx.currentTime);
      this.masterCompressor.release.setValueAtTime(0.25, this.audioCtx.currentTime);
      this.masterCompressor.connect(this.audioCtx.destination);
    }
    
    if (!this.themeGain && this.audioCtx && this.masterCompressor) {
      this.themeGain = this.audioCtx.createGain();
      this.themeGain.connect(this.masterCompressor);
    }
    return this.audioCtx;
  }

  private async createThemeBuffer() {
    const ctx = this.initContext();
    if (this.themeBuffer) return this.themeBuffer;

    const tempo = 180; // BPM (8th notes)
    const beatDuration = 60 / tempo;
    const totalBeats = 48; // 8 bars * 6 beats
    const totalDuration = totalBeats * beatDuration;
    
    // Create an OfflineAudioContext to "pre-render" the music
    const offlineCtx = new OfflineAudioContext(1, ctx.sampleRate * totalDuration, ctx.sampleRate);

    const melody = [
      // Bar 1: C Major
      261.63, 329.63, 392.00, 523.25, 392.00, 329.63,
      // Bar 2: G Major
      196.00, 246.94, 293.66, 392.00, 293.66, 246.94,
      // Bar 3: A Minor
      220.00, 261.63, 329.63, 440.00, 329.63, 261.63,
      // Bar 4: F Major
      174.61, 220.00, 261.63, 349.23, 261.63, 220.00,
      // Bar 5: C Major (Variation)
      261.63, 329.63, 392.00, 523.25, 659.25, 523.25,
      // Bar 6: G Major (Variation)
      392.00, 493.88, 587.33, 783.99, 587.33, 493.88,
      // Bar 7: F Major -> G Major
      349.23, 440.00, 523.25, 392.00, 493.88, 587.33,
      // Bar 8: C Major (Crescendo Finish)
      523.25, 392.00, 329.63, 261.63, 329.63, 392.00
    ];

    for (let i = 0; i < melody.length; i++) {
      const time = i * beatDuration;
      const freq = melody[i];
      const crescendo = 1 + (i / melody.length) * 0.5;

      // Melody - Using SINE waves for maximum smoothness on iPad
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'sine'; 
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.04 * crescendo, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, time + beatDuration * 0.8);
      osc.connect(gain);
      gain.connect(offlineCtx.destination);
      osc.start(time);
      osc.stop(time + beatDuration * 0.8);

      // Bass
      if (i % 3 === 0) {
        const bassOsc = offlineCtx.createOscillator();
        const bassGain = offlineCtx.createGain();
        bassOsc.type = 'sine';
        const bar = Math.floor(i / 6);
        const bassFreqs = [130.81, 98.00, 110.00, 87.31, 130.81, 98.00, 87.31, 130.81];
        const bassFreq = (i % 6 === 0) ? bassFreqs[bar] : bassFreqs[bar] * 1.5;
        bassOsc.frequency.setValueAtTime(bassFreq, time);
        bassGain.gain.setValueAtTime(0, time);
        bassGain.gain.linearRampToValueAtTime(0.06 * crescendo, time + 0.01);
        bassGain.gain.exponentialRampToValueAtTime(0.001, time + beatDuration * 1.5);
        bassOsc.connect(bassGain);
        bassGain.connect(offlineCtx.destination);
        bassOsc.start(time);
        bassOsc.stop(time + beatDuration * 1.5);
      }
    }

    this.themeBuffer = await offlineCtx.startRendering();
    return this.themeBuffer;
  }

  public async resume() {
    const ctx = this.initContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    // Create and play a silent oscillator to fully "prime" the audio engine on iOS
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.warn("Audio unlock failed", e);
    }

    if (this.musicEnabled && !this.themeStarted) {
      await this.startTheme();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1, decay: boolean = true) {
    if (!this.sfxEnabled) return;
    const ctx = this.initContext();
    if (!this.masterCompressor) return;
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    if (decay) {
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    } else {
      gain.gain.setValueAtTime(volume, ctx.currentTime + duration - 0.01);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    }

    osc.connect(gain);
    gain.connect(this.masterCompressor);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  public async startTheme() {
    if (!this.musicEnabled || this.themeStarted) return;
    const ctx = this.initContext();
    if (!this.themeGain) return;

    this.themeStarted = true;
    
    // Ensure buffer is ready
    const buffer = await this.createThemeBuffer();
    
    this.themeGain.gain.cancelScheduledValues(ctx.currentTime);
    this.themeGain.gain.setValueAtTime(0, ctx.currentTime);
    this.themeGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.0);

    // Stop any existing source
    if (this.themeSource) {
      try { this.themeSource.stop(); } catch(e) {}
      this.themeSource.disconnect();
    }

    // Create a single looping source node
    this.themeSource = ctx.createBufferSource();
    this.themeSource.buffer = buffer;
    this.themeSource.loop = true;
    this.themeSource.connect(this.themeGain);
    this.themeSource.start(0);
  }

  public stopTheme(fade: boolean = true) {
    if (!this.themeStarted) return;
    
    const ctx = this.initContext();
    if (this.themeGain && fade) {
      this.themeGain.gain.cancelScheduledValues(ctx.currentTime);
      this.themeGain.gain.setValueAtTime(this.themeGain.gain.value, ctx.currentTime);
      this.themeGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      
      setTimeout(() => {
        if (this.themeSource) {
          try { this.themeSource.stop(); } catch(e) {}
          this.themeSource.disconnect();
          this.themeSource = null;
        }
        this.themeStarted = false;
      }, 500);
    } else {
      if (this.themeSource) {
        try { this.themeSource.stop(); } catch(e) {}
        this.themeSource.disconnect();
        this.themeSource = null;
      }
      this.themeStarted = false;
      if (this.themeGain) {
        this.themeGain.gain.setValueAtTime(0, ctx.currentTime);
      }
    }
  }

  public playWave() {
    if (!this.sfxEnabled) return;
    const ctx = this.initContext();
    if (!this.masterCompressor) return;
    
    // Procedural "Wave Fwooosh" using white noise
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.5);
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 2.0);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.5);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.0);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterCompressor);

    noise.start();
  }

  public play(soundName: 'strike' | 'streak' | 'start' | 'gameOver' | 'miss' | 'undo' | 'click' | 'confirm' | 'remove' | 'tick' | 'tock' | 'jeopardy' | 'connect' | 'launch', color?: 'red' | 'blue' | 'green') {
    if (!this.sfxEnabled) return;
    const ctx = this.initContext();
    if (!this.masterCompressor) return;

    switch (soundName) {
      case 'tick':
        this.playTone(1200, 'sine', 0.02, 0.08);
        break;
      case 'tock':
        this.playTone(800, 'sine', 0.02, 0.08);
        break;
      case 'connect':
        [600, 800, 1000].forEach((f, i) => {
          setTimeout(() => this.playTone(f, 'sine', 0.1, 0.05), i * 60);
        });
        break;
      case 'launch':
        const launchOsc = ctx.createOscillator();
        const launchGain = ctx.createGain();
        launchOsc.type = 'sawtooth';
        launchOsc.frequency.setValueAtTime(100, ctx.currentTime);
        launchOsc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.5);
        launchGain.gain.setValueAtTime(0.1, ctx.currentTime);
        launchGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        launchOsc.connect(launchGain);
        launchGain.connect(this.masterCompressor);
        launchOsc.start();
        launchOsc.stop(ctx.currentTime + 0.5);
        setTimeout(() => this.playTone(1200, 'sine', 0.2, 0.05), 400);
        break;
      case 'jeopardy':
        this.playTone(1800, 'sine', 0.02, 0.04);
        setTimeout(() => this.playTone(1500, 'sine', 0.02, 0.04), 50);
        break;
      case 'strike':
        if (color === 'red') {
          // RED: 50 Pts - Deep Foghorn + "Jackpot"
          this.playTone(90, 'sawtooth', 0.8, 0.15, false);
          this.playTone(92, 'sawtooth', 0.8, 0.1, false);
          this.playTone(180, 'square', 0.4, 0.05, false);
          [880, 1109, 1318, 1760].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'triangle', 0.1, 0.05), i * 50);
          });
        } else if (color === 'blue') {
          // BLUE: 25 Pts - "Boing" + Splash
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(200, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.3);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          osc.connect(gain);
          gain.connect(this.masterCompressor);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
          this.playTone(1200, 'sine', 0.2, 0.05);
        } else {
          // GREEN: 10 Pts - "Clink" + Bubble
          this.playTone(1500, 'triangle', 0.05, 0.1);
          setTimeout(() => this.playTone(1800, 'sine', 0.05, 0.08), 40);
          this.playTone(400, 'sine', 0.05, 0.1);
        }
        break;
      case 'miss':
        this.playTone(110, 'sawtooth', 0.15, 0.1, false);
        setTimeout(() => this.playTone(110, 'sawtooth', 0.15, 0.1, false), 200);
        break;
      case 'undo':
        const undoOsc = ctx.createOscillator();
        const undoGain = ctx.createGain();
        undoOsc.type = 'sine';
        undoOsc.frequency.setValueAtTime(600, ctx.currentTime);
        undoOsc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
        undoGain.gain.setValueAtTime(0.1, ctx.currentTime);
        undoGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        undoOsc.connect(undoGain);
        undoGain.connect(this.masterCompressor);
        undoOsc.start();
        undoOsc.stop(ctx.currentTime + 0.2);
        break;
      case 'click':
        this.playTone(1200, 'sine', 0.02, 0.02);
        break;
      case 'confirm':
        this.playTone(880, 'sine', 0.1, 0.1);
        setTimeout(() => this.playTone(1109, 'sine', 0.1, 0.1), 50);
        break;
      case 'remove':
        this.playTone(150, 'sine', 0.1, 0.1);
        break;
      case 'streak':
        [330, 392, 440, 523, 659].forEach((f, i) => {
          setTimeout(() => this.playTone(f, 'square', 0.2, 0.08), i * 120);
        });
        break;
      case 'start':
        [523, 659, 783, 1046].forEach((f, i) => {
          setTimeout(() => this.playTone(f, 'square', 0.2, 0.05), i * 100);
        });
        break;
      case 'gameOver':
        this.playTone(100, 'sawtooth', 1.0, 0.1, true);
        [783, 659, 523, 392].forEach((f, i) => {
          setTimeout(() => this.playTone(f, 'sawtooth', 0.4, 0.05), 500 + (i * 200));
        });
        break;
    }
  }

  public isSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  public isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  public setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
    localStorage.setItem('sfx_enabled', String(enabled));
  }

  public setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    localStorage.setItem('music_enabled', String(enabled));
    if (enabled) {
      this.startTheme();
    } else {
      this.stopTheme();
    }
  }
}

export const audioService = new AudioService();
