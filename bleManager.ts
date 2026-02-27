export const BLE_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const BLE_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

export class BLEManager extends EventTarget {
  device: any = null;
  status: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  error: string | null = null;

  async connectBlue() {
    // FIX: Cast navigator to any to access the experimental 'bluetooth' property
    if (!(navigator as any).bluetooth) {
      this.error = "Web Bluetooth is not supported in this browser. Please use Chrome or Edge on macOS.";
      this.dispatchEvent(new Event('statuschange'));
      return;
    }

    try {
      this.status = 'connecting';
      this.error = null;
      this.dispatchEvent(new Event('statuschange'));

      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { services: [BLE_SERVICE_UUID] },
          { name: 'OTD_BLUE_TARGET' }
        ],
        optionalServices: [BLE_SERVICE_UUID]
      });

      this.device = device;
      device.addEventListener('gattserverdisconnected', () => this.handleDisconnect());

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
          if (value.trim() === 'HIT:BLUE' && now - lastHitTime > 500) {
            lastHitTime = now;
            window.dispatchEvent(new CustomEvent('ble-hit', { detail: { color: 'blue' } }));
          }
        });
      }

      this.status = 'connected';
      this.dispatchEvent(new Event('statuschange'));
    } catch (err: any) {
      this.status = 'disconnected';
      if (err.name !== 'NotFoundError') {
        this.error = err.message || 'Connection failed';
      }
      this.dispatchEvent(new Event('statuschange'));
    }
  }

  handleDisconnect() {
    this.status = 'disconnected';
    this.device = null;
    this.dispatchEvent(new Event('statuschange'));
  }
}

const bleManagerInstance = new BLEManager();
export const bleManager = bleManagerInstance;
