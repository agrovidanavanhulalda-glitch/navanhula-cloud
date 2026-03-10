/// <reference types="web-bluetooth" />

interface BluetoothRemoteGATTCharacteristic {
  properties: {
    write: boolean;
    writeWithoutResponse: boolean;
  };
  writeValueWithResponse(value: BufferSource): Promise<void>;
  writeValueWithoutResponse(value: BufferSource): Promise<void>;
}

interface BluetoothRemoteGATTService {
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
}

interface BluetoothRemoteGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothDevice {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
}

interface Bluetooth {
  requestDevice(options: {
    filters?: Array<{ services?: string[]; namePrefix?: string }>;
    optionalServices?: string[];
  }): Promise<BluetoothDevice>;
}

declare global {
  interface Navigator {
    bluetooth: Bluetooth;
  }
}

export {};
