import { audioService } from './audioService';

export const BLE_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const BLE_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
export const BLE_WRITE_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

export class BLEManager extends EventTarget {
  public currentGameName: string = 'None';
  devices: Record<string, any> = { red: null, blue: null, green: null };
  writeCharacteristics: Record<string, any> = { red: null, blue: null, green: null };
  statuses: Record<string, 'disconnected' | 'connecting' | 'connected'> = {
    red: 'disconnected', blue: 'disconnected', green: 'disconnected'
  };
  lightStates: Record<string, boolean> = { red: false, blue: false, green: false };
  errors: Record<string, string | null> = { red: null, blue: null, green: null };

  async connect(color: 'red' | 'blue' | 'green') {
    if (!(navigator as any).bluetooth) {
      this.errors[color] = "Web Bluetooth is not supported in this browser.";
      this.dispatchEvent(new Event('statuschange'));
      return;
    }

    try {
      this.statuses[color] = 'connecting';
      this.errors[color] = null;
      this.dispatchEvent(new Event('statuschange'));

      const deviceName = `OTD_${color.toUpperCase()}_TARGET`;
      
      // CRITICAL FIX: Removed the background getDevices() check.
      // We strictly call requestDevice directly so the browser doesn't block the click.
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ name: deviceName }],
        optionalServices: [BLE_SERVICE_UUID]
      });

      await this.setupDevice(device, color);
    } catch (err: any) {
      this.statuses[color] = 'disconnected';
      if (err.name !== 'NotFoundError') { // NotFoundError is just the user cancelling the popup
        this.errors[color] = err.message || 'Connection failed';
        console.error(`BLE: Connection error for ${color}`, err);
      }
      this.dispatchEvent(new Event('statuschange'));
    }
  }

  // Force-clear all sessions and state
  async resetAll() {
    console.log("BLE: Resetting all Bluetooth states...");
    for (const color of ['red', 'blue', 'green'] as const) {
      const device = this.devices[color];
      if (device && device.gatt?.connected) {
        try { device.gatt.disconnect(); } catch (e) {}
      }
      this.devices[color] = null;
      this.writeCharacteristics[color] = null;
      this.statuses[color] = 'disconnected';
      this.lightStates[color] = false;
      this.errors[color] = null;
    }
    this.dispatchEvent(new Event('statuschange'));
  }

  private async setupDevice(device: any, color: 'red' | 'blue' | 'green') {
    this.devices[color] = device;
    device.removeEventListener('gattserverdisconnected', () => this.handleDisconnect(color));
    device.addEventListener('gattserverdisconnected', () => this.handleDisconnect(color));

    const server = await device.gatt?.connect();
    const service = await server?.getPrimaryService(BLE_SERVICE_UUID);
    const characteristic = await service?.getCharacteristic(BLE_CHARACTERISTIC_UUID);
    
    // Grab the write characteristic if it exists
    try {
      const writeChar = await service?.getCharacteristic(BLE_WRITE_CHARACTERISTIC_UUID);
      this.writeCharacteristics[color] = writeChar;
    } catch (e) {
      console.warn(`BLE: Could not find write characteristic for ${color}`, e);
    }

    if (characteristic) {
      let lastHitTime = 0;
      const decoder = new TextDecoder();
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', async (event: any) => {
        const now = Date.now();
        const value = decoder.decode(event.target.value);
        if (value.trim() === `HIT:${color.toUpperCase()}` && now - lastHitTime > 500) {
          lastHitTime = now;
          window.dispatchEvent(new CustomEvent('ble-hit', { detail: { color } }));

          // Supabase Logging
          try {
            const supabaseUrl = 'https://tyueyjwhrlntazppmxqi.supabase.co';
            const supabaseKey = 'sb_publishable_vHf0M3-3i4aOC70zpEuqwQ_Z_cpz-IW';
            const supabase = (window as any).supabase?.createClient(supabaseUrl, supabaseKey);
            if (supabase) {
              supabase.from('hits').insert([{ account_id: 'Test-Yacht-1', is_miss: false, game_type: this.currentGameName }]);
            }
          } catch (err: any) {}
        }
      });
    }

    this.statuses[color] = 'connected';
    audioService.play('connect');
    this.dispatchEvent(new Event('statuschange'));
  }

  async setLights(color: 'red' | 'blue' | 'green', isOn: boolean) {
    const writeChar = this.writeCharacteristics[color];
    if (!writeChar) return;

    try {
      this.lightStates[color] = isOn;
      this.dispatchEvent(new Event('statuschange')); // Update UI immediately
      
      const commandString = isOn ? 'L:1' : 'L:0';
      const encoder = new TextEncoder();
      const commandBytes = encoder.encode(commandString);
      
      await writeChar.writeValueWithoutResponse(commandBytes);
      console.log(`BLE: Sent command ${commandString} to ${color}`);
    } catch (e) {
      // Revert state if it failed
      this.lightStates[color] = !isOn;
      this.dispatchEvent(new Event('statuschange'));
    }
  }

  async disconnect(color: 'red' | 'blue' | 'green') {
    const device = this.devices[color];
    if (device && device.gatt?.connected) {
      device.gatt.disconnect();
    }
    this.handleDisconnect(color);
  }

  handleDisconnect(color: 'red' | 'blue' | 'green') {
    this.statuses[color] = 'disconnected';
    this.devices[color] = null;
    this.writeCharacteristics[color] = null;
    // CRITICAL FIX: Removed the attemptAutoReconnect() loop. 
    // This allows the ESP32 to fully sever the connection and reset cleanly.
    this.dispatchEvent(new Event('statuschange'));
  }

  // Legacy methods
  async connectBlue() { return this.connect('blue'); }
  async disconnectBlue() { return this.disconnect('blue'); }
  get status() { return this.statuses.blue; }
  get error() { return this.errors.blue; }
}

const bleManagerInstance = new BLEManager();
export const bleManager = bleManagerInstance;