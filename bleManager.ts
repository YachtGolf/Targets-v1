// Renamed to avoid conflicting with your constants.ts file
export const BLE_UUIDS = {
  green: {
    service: '11111111-b5a3-f393-e0a9-e50e24dcca9e',
    notify:  '11111111-b5a3-f393-e0a9-e50e24dccaa1',
    write:   '11111111-b5a3-f393-e0a9-e50e24dccaa2'
  },
  blue: {
    service: '22222222-b5a3-f393-e0a9-e50e24dcca9e',
    notify:  '22222222-b5a3-f393-e0a9-e50e24dccaa1',
    write:   '22222222-b5a3-f393-e0a9-e50e24dccaa2'
  },
  red: {
    service: '33333333-b5a3-f393-e0a9-e50e24dcca9e',
    notify:  '33333333-b5a3-f393-e0a9-e50e24dccaa1',
    write:   '33333333-b5a3-f393-e0a9-e50e24dccaa2'
  }
};

class BLEManager extends EventTarget {
  devices: { [key: string]: any } = {};
  writeCharacteristics: { [key: string]: any } = {};
  statuses: { [key: string]: string } = { red: 'disconnected', blue: 'disconnected', green: 'disconnected' };
  
  // RESTORED: The errors object required by ConnectTargets.tsx
  errors: { [key: string]: string } = { red: '', blue: '', green: '' }; 
  
  reconnecting: { [key: string]: boolean } = { red: false, blue: false, green: false };
  lightStates: { [key: string]: boolean } = { red: false, blue: false, green: false };
  currentGameName: string = '';

  async connect(color: 'red' | 'blue' | 'green') {
    try {
      this.statuses[color] = 'connecting';
      this.errors[color] = ''; // Clear previous errors
      this.dispatchEvent(new Event('statuschange'));

      const config = BLE_UUIDS[color];

      // Request device by strict UUID, bypassing any cached names
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [config.service] }]
      });

      await this.setupDevice(device, color, config);
    } catch (error: any) {
      console.error(`BLE Connection failed for ${color}:`, error);
      this.statuses[color] = 'disconnected';
      
      // RESTORED: Pass error messages to the UI
      this.errors[color] = error.message || 'Connection failed';
      this.dispatchEvent(new Event('statuschange'));
    }
  }

  async disconnect(color: 'red' | 'blue' | 'green') {
    const device = this.devices[color];
    if (device && device.gatt?.connected) {
      device.gatt.disconnect();
    }
  }

  // RESTORED: The reset function for your UI button
  resetAll() {
    Object.keys(this.devices).forEach(color => {
      this.disconnect(color as 'red' | 'blue' | 'green');
    });
    this.statuses = { red: 'disconnected', blue: 'disconnected', green: 'disconnected' };
    this.errors = { red: '', blue: '', green: '' };
    this.lightStates = { red: false, blue: false, green: false };
    this.dispatchEvent(new Event('statuschange'));
  }

  private async setupDevice(device: any, color: 'red' | 'blue' | 'green', config: any) {
    this.devices[color] = device;
    device.removeEventListener('gattserverdisconnected', () => this.handleDisconnect(color));
    device.addEventListener('gattserverdisconnected', () => this.handleDisconnect(color));

    const server = await device.gatt?.connect();
    const service = await server?.getPrimaryService(config.service);
    
    // Standard explicit fetch for Bluefy stability
    const notifyChar = await service?.getCharacteristic(config.notify).catch(() => null);
    const writeChar = await service?.getCharacteristic(config.write).catch(() => null);

    this.writeCharacteristics[color] = writeChar || null;

    if (notifyChar) {
      let lastHitTime = 0;
      const decoder = new TextDecoder();
      await notifyChar.startNotifications();
      notifyChar.addEventListener('characteristicvaluechanged', async (event: any) => {
        const now = Date.now();
        const value = decoder.decode(event.target.value);
        if (value.trim() === `HIT:${color.toUpperCase()}` && now - lastHitTime > 500) {
          lastHitTime = now;
          window.dispatchEvent(new CustomEvent('ble-hit', { detail: { color } }));

// Supabase Logging (Silent & Safe)
          try {
            const supabaseUrl = 'https://tyueyjwhrlntazppmxqi.supabase.co';
            const supabaseKey = 'sb_publishable_vHf0M3-3i4aOC70zpEuqwQ_Z_cpz-IW';
            const supabase = (window as any).supabase?.createClient(supabaseUrl, supabaseKey);
            
            if (supabase) {
              const { error } = await supabase.from('hits').insert([{ 
                account_id: 'Test-Yacht-1', 
                target_color: color, 
                is_miss: false, 
                game_type: this.currentGameName || 'Unknown Game' 
              }]);

              if (error) {
                console.error('[Supabase] Rejected:', error.message);
              } else {
                console.log('[Supabase] Hit logged!');
              }
            } else {
              console.error('[Supabase] Library missing.');
            }
          } catch (err: any) {
            console.error('[Supabase] Code Crash:', err.message);
          }
          }
      });
    }

    this.statuses[color] = 'connected';
    this.errors[color] = '';
    this.reconnecting[color] = false;
    
    if ((window as any).audioService) {
        (window as any).audioService.play('connect');
    }
    this.dispatchEvent(new Event('statuschange'));
  }

  async setLights(color: 'red' | 'blue' | 'green', isOn: boolean) {
    const writeChar = this.writeCharacteristics[color];
    
    if (!writeChar) {
      console.error(`BLE: No write characteristic found for ${color}.`);
      return; 
    }

    try {
      // Optimistically update UI
      this.lightStates[color] = isOn;
      this.dispatchEvent(new Event('statuschange')); 
      
      const commandString = isOn ? 'L:1' : 'L:0';
      const commandBytes = new TextEncoder().encode(commandString);
      
      // Standard write
      await writeChar.writeValue(commandBytes);
      console.log(`BLE: Sent command ${commandString} to ${color}`);
      
    } catch (e) {
      console.error("BLE Write failed:", e);
      // Revert UI on failure
      this.lightStates[color] = !isOn;
      this.dispatchEvent(new Event('statuschange'));
    }
  }

  handleDisconnect(color: 'red' | 'blue' | 'green') {
    this.statuses[color] = 'disconnected';
    this.devices[color] = null;
    this.writeCharacteristics[color] = null;
    this.dispatchEvent(new Event('statuschange'));
  }
  
  setCurrentGameName(name: string) {
      this.currentGameName = name;
  }
}

export const bleManager = new BLEManager();
