
export class AudioDetectionService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private isListening: boolean = false;
  private threshold: number = 0.15;
  private cooldownPeriod: number = 1000; // milliseconds
  private lastClapTime: number = 0;
  private onClapDetectedCallback: (() => void) | null = null;

  constructor() {
    // Audio context will be initialized on start
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Release the stream immediately after getting permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.error('Microphone permission denied:', err);
      return false;
    }
  }

  async start(onClapDetected: () => void): Promise<boolean> {
    if (this.isListening) return true;
    
    try {
      // Request microphone permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return false;
      
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio context and analyser
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      // Connect microphone to analyser
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);
      
      // Set up clap detection
      this.onClapDetectedCallback = onClapDetected;
      this.isListening = true;
      
      this.detectClaps();
      return true;
    } catch (err) {
      console.error('Error starting audio detection:', err);
      this.stop();
      return false;
    }
  }

  stop(): void {
    if (!this.isListening) return;
    
    // Clean up resources
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.isListening = false;
    this.onClapDetectedCallback = null;
  }

  private detectClaps(): void {
    if (!this.isListening || !this.analyser || !this.audioContext) return;
    
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const detectSound = () => {
      if (!this.isListening) return;
      
      this.analyser!.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength / 255; // Normalize to 0-1
      
      // Detect clap based on volume threshold
      const now = Date.now();
      if (average > this.threshold && now - this.lastClapTime > this.cooldownPeriod) {
        this.lastClapTime = now;
        console.log('Clap detected!', average);
        this.onClapDetectedCallback?.();
      }
      
      // Continue detection loop
      requestAnimationFrame(detectSound);
    };
    
    detectSound();
  }

  setThreshold(value: number): void {
    this.threshold = Math.max(0, Math.min(1, value));
  }

  setCooldownPeriod(milliseconds: number): void {
    this.cooldownPeriod = Math.max(100, milliseconds);
  }

  isActive(): boolean {
    return this.isListening;
  }
}

export default new AudioDetectionService();
