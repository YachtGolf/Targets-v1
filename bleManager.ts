
import { audioService } from './audioService';

export const BLE_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const BLE_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

export class BLEManager extends EventTarget {
  devices: Record<string, any> = { red: null, blue: null, green: null };
  statuses: Record<string, 'disconnected' | 'connecting' | 'connected'> = {
    red: 'disconnected', blue: 'disconnected', green: 'disconnected'
  };
  errors: Record<string, string | null> = { red: null, blue: null, green: null };

  async connect(color: 'red' | 'blue' | 'green') {
    if (!(navigator as any).bluetooth) {
      this.errors[color] = "Web Bluetooth is not supported in this browser. Please use a compatible browser like Bluefy (iOS) or Chrome/Edge (Desktop).";
      this.dispatchEvent(new Event('statuschange'));
      return;
    }

    try {
      this.statuses[color] = 'connecting';
      this.errors[color] = null;
      this.dispatchEvent(new Event('statuschange'));

      const deviceName = `OTD_${color.toUpperCase()}_TARGET`;
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { services: [BLE_SERVICE_UUID] },
          { name: deviceName }
        ],
        optionalServices: [BLE_SERVICE_UUID]
      });

      this.devices[color] = device;
      device.addEventListener('gattserverdisconnected', () => this.handleDisconnect(color));

      const server = await device.gatt?.connect();
      const service = await server?.getPrimaryService(BLE_SERVICE_UUID);
      const characteristic = await service?.getCharacteristic(BLE_CHARACTERISTIC_UUID);

      if (characteristic) {
        let lastHitTime = 0;
        const decoder = new TextDecoder();
        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
          const now = Date.now();
          const value = decoder.decode(event.target.value);
          if (value.trim() === `HIT:${color.toUpperCase()}` && now - lastHitTime > 500) {
            lastHitTime = now;
            window.dispatchEvent(new CustomEvent('ble-hit', { detail: { color } }));
          }
        });
      }

      this.statuses[color] = 'connected';
      audioService.play('connect');
      this.dispatchEvent(new Event('statuschange'));
    } catch (err: any) {
      this.statuses[color] = 'disconnected';
      if (err.name !== 'NotFoundError') {
        this.errors[color] = err.message || 'Connection failed';
      }
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
    this.dispatchEvent(new Event('statuschange'));
  }

  // Legacy methods for backward compatibility if needed
  async connectBlue() { return this.connect('blue'); }
  async disconnectBlue() { return this.disconnect('blue'); }

  // Getters for single-target compatibility if needed
  get status() { return this.statuses.blue; }
  get error() { return this.errors.blue; }
}

const bleManagerInstance = new BLEManager();
export const bleManager = bleManagerInstance;
