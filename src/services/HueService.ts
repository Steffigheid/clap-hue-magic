
interface HueBridge {
  id: string;
  internalipaddress: string;
}

interface HueLight {
  id: string;
  name: string;
  state: {
    on: boolean;
    [key: string]: any;
  };
}

export class HueService {
  private bridgeIp: string | null = null;
  private username: string | null = null;
  private lights: HueLight[] = [];
  private storagePrefix = 'clapHueMagic_';

  constructor() {
    // Try to load saved credentials
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    this.bridgeIp = localStorage.getItem(`${this.storagePrefix}bridgeIp`);
    this.username = localStorage.getItem(`${this.storagePrefix}username`);
  }

  private saveToStorage(): void {
    if (this.bridgeIp) {
      localStorage.setItem(`${this.storagePrefix}bridgeIp`, this.bridgeIp);
    }
    if (this.username) {
      localStorage.setItem(`${this.storagePrefix}username`, this.username);
    }
  }

  async discoverBridge(): Promise<string | null> {
    try {
      // Try to use cached bridge IP first
      if (this.bridgeIp) {
        return this.bridgeIp;
      }

      // Discover bridges using the Philips Hue discovery API
      const response = await fetch('https://discovery.meethue.com/');
      if (!response.ok) {
        throw new Error('Failed to discover Hue bridges');
      }

      const bridges: HueBridge[] = await response.json();
      
      if (bridges.length === 0) {
        return null;
      }

      // Use the first bridge found
      this.bridgeIp = bridges[0].internalipaddress;
      this.saveToStorage();
      return this.bridgeIp;
    } catch (error) {
      console.error('Error discovering Hue bridge:', error);
      return null;
    }
  }

  async createUser(): Promise<string | null> {
    if (!this.bridgeIp) {
      const discoveredIp = await this.discoverBridge();
      if (!discoveredIp) {
        return null;
      }
    }

    try {
      const response = await fetch(`http://${this.bridgeIp}/api`, {
        method: 'POST',
        body: JSON.stringify({ devicetype: 'clap_hue_magic#phone' }),
      });

      const data = await response.json();
      
      if (data[0]?.error?.type === 101) {
        // Link button not pressed
        return 'link_button_not_pressed';
      }

      if (data[0]?.success?.username) {
        this.username = data[0].success.username;
        this.saveToStorage();
        return this.username;
      }

      return null;
    } catch (error) {
      console.error('Error creating Hue user:', error);
      return null;
    }
  }

  async getLights(): Promise<HueLight[]> {
    if (!this.bridgeIp || !this.username) {
      return [];
    }

    try {
      const response = await fetch(`http://${this.bridgeIp}/api/${this.username}/lights`);
      if (!response.ok) {
        throw new Error('Failed to get lights');
      }

      const data = await response.json();
      
      // Convert response to array of lights
      this.lights = Object.entries(data).map(([id, lightData]: [string, any]) => ({
        id,
        name: lightData.name,
        state: lightData.state
      }));

      return this.lights;
    } catch (error) {
      console.error('Error getting lights:', error);
      return [];
    }
  }

  async toggleAllLights(): Promise<boolean> {
    if (!this.bridgeIp || !this.username) {
      return false;
    }

    try {
      // Get current lights if we don't have them
      if (this.lights.length === 0) {
        await this.getLights();
      }

      // Determine the state to set (opposite of majority of lights)
      const onCount = this.lights.filter(light => light.state.on).length;
      const turnOn = onCount < this.lights.length / 2;

      // Toggle all lights
      for (const light of this.lights) {
        await fetch(`http://${this.bridgeIp}/api/${this.username}/lights/${light.id}/state`, {
          method: 'PUT',
          body: JSON.stringify({ on: turnOn }),
        });
      }

      // Update our local state
      this.lights = this.lights.map(light => ({
        ...light,
        state: {
          ...light.state,
          on: turnOn
        }
      }));

      return true;
    } catch (error) {
      console.error('Error toggling lights:', error);
      return false;
    }
  }

  isConnected(): boolean {
    return !!this.bridgeIp && !!this.username;
  }

  getBridgeIp(): string | null {
    return this.bridgeIp;
  }

  // For manually setting the bridge IP if discovery fails
  setBridgeIp(ip: string): void {
    this.bridgeIp = ip;
    this.saveToStorage();
  }

  reset(): void {
    this.bridgeIp = null;
    this.username = null;
    localStorage.removeItem(`${this.storagePrefix}bridgeIp`);
    localStorage.removeItem(`${this.storagePrefix}username`);
  }
}

export default new HueService();
