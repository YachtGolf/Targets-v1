class AudioService {
  private enabled: boolean = true;
  private audioCtx: AudioContext | null = null;

  constructor() {
    const saved = localStorage.getItem('sound_enabled');
    this.enabled = saved !== null ? saved === 'true' : true;
  }

  private initContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioCtx;
  }

  public async resume() {
    const ctx = this.initContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1, decay: boolean = true) {
    if (!this.enabled) return;
    const ctx = this.initContext();
    
    // On iOS, we still try to resume just in case, though it usually needs a direct user gesture
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
      setTimeout(() => gain.gain.setValueAtTime(0, ctx.currentTime), duration * 1000);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  public play(soundName: 'strike' | 'streak' | 'start' | 'gameOver' | 'miss' | 'undo' | 'click' | 'confirm' | 'remove' | 'tick' | 'tock' | 'jeopardy', color?: 'red' | 'blue' | 'green') {
    if (!this.enabled) return;

    switch (soundName) {
      case 'tick':
        this.playTone(1200, 'sine', 0.02, 0.02);
        break;
      case 'tock':
        this.playTone(800, 'sine', 0.02, 0.02);
        break;
      case 'jeopardy':
        // Sharp, high-pitched double-tick
        this.playTone(1800, 'sine', 0.02, 0.04);
        setTimeout(() => this.playTone(1500, 'sine', 0.02, 0.04), 50);
        break;
      case 'strike':
        if (color === 'red') {
          // RED: High Points - Deep Foghorn + "Jackpot"
          this.playTone(90, 'sawtooth', 0.8, 0.15, false);
          this.playTone(92, 'sawtooth', 0.8, 0.1, false);
          this.playTone(180, 'square', 0.4, 0.05, false);
          [880, 1109, 1318, 1760].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'triangle', 0.1, 0.05), i * 50);
          });
        } else if (color === 'blue') {
          // BLUE: Medium Points - "Boing" + Splash
          const ctx = this.initContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(200, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.3);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
          this.playTone(1200, 'sine', 0.2, 0.05);
        } else {
          // GREEN: Low Points - "Clink" + Bubble
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
        // Gentle "Whoosh" / Rewind
        const undoCtx = this.initContext();
        const undoOsc = undoCtx.createOscillator();
        const undoGain = undoCtx.createGain();
        undoOsc.type = 'sine';
        undoOsc.frequency.setValueAtTime(600, undoCtx.currentTime);
        undoOsc.frequency.exponentialRampToValueAtTime(200, undoCtx.currentTime + 0.2);
        undoGain.gain.setValueAtTime(0.1, undoCtx.currentTime);
        undoGain.gain.exponentialRampToValueAtTime(0.001, undoCtx.currentTime + 0.2);
        undoOsc.connect(undoGain);
        undoGain.connect(undoCtx.destination);
        undoOsc.start();
        undoOsc.stop(undoCtx.currentTime + 0.2);
        break;
      case 'click':
        // Subtle "Tick"
        this.playTone(1200, 'sine', 0.02, 0.02);
        break;
      case 'confirm':
        // Pleasant "Ding"
        this.playTone(880, 'sine', 0.1, 0.1);
        setTimeout(() => this.playTone(1109, 'sine', 0.1, 0.1), 50);
        break;
      case 'remove':
        // Gentle "Thud"
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

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('sound_enabled', String(enabled));
  }

  public toggle() {
    this.setEnabled(!this.enabled);
  }
}

export const audioService = new AudioService();
