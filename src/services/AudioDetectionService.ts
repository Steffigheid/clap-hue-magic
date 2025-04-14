
export class AudioDetectionService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private isListening: boolean = false;
  private threshold: number = 0.15;
  private cooldownPeriod: number = 1000; // milliseconds
  private lastClapTime: number = 0;
  private onClapDetectedCallback: (() => void) | null = null;
  private connectionRetryCount: number = 0;
  private maxRetries: number = 3;

  constructor() {
    // Audio context will be initialized on start
    console.log('AudioDetectionService initialized');
  }

  async requestPermissions(): Promise<boolean> {
    try {
      console.log('Requesting microphone permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Release the stream immediately after getting permission
      stream.getTracks().forEach(track => track.stop());
      console.log('Microphone permissions granted');
      return true;
    } catch (err) {
      console.error('Microphone permission denied:', err);
      return false;
    }
  }

  async start(onClapDetected: () => void): Promise<{success: boolean, message?: string}> {
    if (this.isListening) return {success: true};
    
    try {
      // Request microphone permissions
      console.log('Starting audio detection service...');
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return {
          success: false, 
          message: 'Microphone permission denied. Please grant microphone access to use clap detection.'
        };
      }
      
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        .catch(err => {
          console.error('Error accessing microphone:', err);
          throw new Error(`Could not access microphone: ${err.message}`);
        });
      
      // Set up audio context and analyser
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
      } catch (err) {
        console.error('Error creating audio context:', err);
        return {
          success: false,
          message: 'Could not initialize audio processing. Your device may not support this feature.'
        };
      }
      
      // Connect microphone to analyser
      try {
        this.microphone = this.audioContext.createMediaStreamSource(stream);
        this.microphone.connect(this.analyser);
      } catch (err) {
        console.error('Error connecting audio components:', err);
        this.stop();
        return {
          success: false,
          message: 'Error setting up audio processing. Please try again.'
        };
      }
      
      // Set up clap detection
      this.onClapDetectedCallback = onClapDetected;
      this.isListening = true;
      console.log('Audio detection service started successfully');
      
      this.detectClaps();
      return {success: true};
    } catch (err) {
      console.error('Error starting audio detection:', err);
      this.stop();
      return {
        success: false,
        message: `Could not start clap detection: ${err instanceof Error ? err.message : 'Unknown error'}`
      };
    }
  }

  stop(): void {
    if (!this.isListening) return;
    
    console.log('Stopping audio detection service...');
    
    // Clean up resources
    if (this.microphone) {
      try {
        this.microphone.disconnect();
      } catch (e) {
        console.warn('Error disconnecting microphone:', e);
      }
      this.microphone = null;
    }
    
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {
        console.warn('Error closing audio context:', e);
      }
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.isListening = false;
    this.onClapDetectedCallback = null;
    console.log('Audio detection service stopped');
  }

  private detectClaps(): void {
    if (!this.isListening || !this.analyser || !this.audioContext) return;
    
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const detectSound = () => {
      if (!this.isListening) return;
      
      try {
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
      } catch (err) {
        console.error('Error in clap detection loop:', err);
        // Attempt to recover from temporary errors
        if (this.connectionRetryCount < this.maxRetries) {
          this.connectionRetryCount++;
          console.log(`Retrying clap detection (${this.connectionRetryCount}/${this.maxRetries})...`);
          setTimeout(() => requestAnimationFrame(detectSound), 1000);
        } else {
          console.error('Max retries exceeded, stopping clap detection');
          this.stop();
        }
      }
    };
    
    detectSound();
  }

  setThreshold(value: number): void {
    this.threshold = Math.max(0, Math.min(1, value));
    console.log(`Clap detection threshold set to: ${this.threshold}`);
  }

  setCooldownPeriod(milliseconds: number): void {
    this.cooldownPeriod = Math.max(100, milliseconds);
    console.log(`Clap detection cooldown period set to: ${this.cooldownPeriod}ms`);
  }

  isActive(): boolean {
    return this.isListening;
  }
}

export default new AudioDetectionService();
