/// <reference path="../types/web-bluetooth.d.ts" />
/**
 * Bluetooth Thermal Printer Service
 * 
 * Uses Web Bluetooth API (Chrome/Edge) with Capacitor native fallback.
 * Supports ESC/POS commands for 58mm and 80mm thermal printers.
 */

// ESC/POS Commands
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

const COMMANDS = {
  INIT: new Uint8Array([ESC, 0x40]),
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]),
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]),
  ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 0x02]),
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]),
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]),
  DOUBLE_HEIGHT: new Uint8Array([GS, 0x21, 0x10]),
  DOUBLE_WIDTH: new Uint8Array([GS, 0x21, 0x20]),
  NORMAL_SIZE: new Uint8Array([GS, 0x21, 0x00]),
  CUT: new Uint8Array([GS, 0x56, 0x00]),
  PARTIAL_CUT: new Uint8Array([GS, 0x56, 0x01]),
  FEED_LINES: (n: number) => new Uint8Array([ESC, 0x64, n]),
  LINE: new Uint8Array([LF]),
};

export interface PrinterDevice {
  id: string;
  name: string;
  address?: string;
}

export interface ReceiptData {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  storeNuit?: string;
  receiptNumber: string;
  date: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  amountReceived?: number;
  change?: number;
  sellerName?: string;
}

class BluetoothPrinterService {
  private device: any = null;
  private characteristic: any = null;
  private connected = false;

  /**
   * Check if Web Bluetooth is available
   */
  isAvailable(): boolean {
    return 'bluetooth' in navigator;
  }

  /**
   * Check if running inside Capacitor native shell
   */
  isNative(): boolean {
    return typeof (window as any).Capacitor !== 'undefined';
  }

  /**
   * Scan and connect to a Bluetooth printer
   */
  async connect(): Promise<PrinterDevice> {
    if (!this.isAvailable()) {
      throw new Error('Bluetooth não disponível neste navegador. Use Chrome ou Edge.');
    }

    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
          { namePrefix: 'Printer' },
          { namePrefix: 'POS' },
          { namePrefix: 'BlueTooth' },
          { namePrefix: 'BT' },
        ],
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '0000ff00-0000-1000-8000-00805f9b34fb',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455',
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        ],
      });

      if (!this.device) throw new Error('Nenhuma impressora selecionada.');

      const server = await this.device.gatt?.connect();
      if (!server) throw new Error('Falha ao conectar ao servidor GATT.');

      // Try known printer service UUIDs
      const serviceUUIDs = [
        '000018f0-0000-1000-8000-00805f9b34fb',
        '0000ff00-0000-1000-8000-00805f9b34fb',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
      ];

      for (const uuid of serviceUUIDs) {
        try {
          const service = await server.getPrimaryService(uuid);
          const characteristics = await service.getCharacteristics();
          
          // Find writable characteristic
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              this.characteristic = char;
              this.connected = true;
              return {
                id: this.device.id,
                name: this.device.name || 'Impressora Bluetooth',
              };
            }
          }
        } catch {
          continue;
        }
      }

      throw new Error('Nenhuma característica de escrita encontrada na impressora.');
    } catch (error: any) {
      this.disconnect();
      if (error.name === 'NotFoundError') {
        throw new Error('Nenhuma impressora encontrada. Verifique se está ligada e pareada.');
      }
      throw error;
    }
  }

  /**
   * Disconnect from the printer
   */
  disconnect(): void {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
    this.connected = false;
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.connected && !!this.device?.gatt?.connected;
  }

  /**
   * Send raw bytes to the printer (chunked for BLE limit)
   */
  private async sendData(data: Uint8Array): Promise<void> {
    if (!this.characteristic) throw new Error('Impressora não conectada.');

    const chunkSize = 100; // BLE MTU safe size
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      if (this.characteristic.properties.writeWithoutResponse) {
        await this.characteristic.writeValueWithoutResponse(chunk);
      } else {
        await this.characteristic.writeValueWithResponse(chunk);
      }
      // Small delay between chunks
      await new Promise(r => setTimeout(r, 50));
    }
  }

  /**
   * Encode text to bytes
   */
  private encode(text: string): Uint8Array {
    return new TextEncoder().encode(text);
  }

  /**
   * Combine multiple Uint8Arrays
   */
  private concat(...arrays: Uint8Array[]): Uint8Array {
    const total = arrays.reduce((acc, a) => acc + a.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    for (const a of arrays) {
      result.set(a, offset);
      offset += a.length;
    }
    return result;
  }

  /**
   * Print a separator line
   */
  private separator(char = '-', width = 32): Uint8Array {
    return this.concat(this.encode(char.repeat(width)), COMMANDS.LINE);
  }

  /**
   * Print a two-column line (left-aligned and right-aligned)
   */
  private twoColumns(left: string, right: string, width = 32): Uint8Array {
    const spaces = width - left.length - right.length;
    const line = left + ' '.repeat(Math.max(1, spaces)) + right;
    return this.concat(this.encode(line), COMMANDS.LINE);
  }

  /**
   * Format currency for receipt
   */
  private formatMoney(value: number): string {
    return value.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MT';
  }

  /**
   * Print a full thermal receipt
   */
  async printReceipt(data: ReceiptData): Promise<void> {
    const paymentLabels: Record<string, string> = {
      cash: 'Dinheiro',
      card: 'Cartão',
      mpesa: 'M-Pesa',
      emola: 'E-Mola',
      voucher: 'Voucher',
    };

    const parts: Uint8Array[] = [
      COMMANDS.INIT,
      // Header
      COMMANDS.ALIGN_CENTER,
      COMMANDS.BOLD_ON,
      COMMANDS.DOUBLE_HEIGHT,
      this.encode(data.storeName),
      COMMANDS.LINE,
      COMMANDS.NORMAL_SIZE,
      COMMANDS.BOLD_OFF,
    ];

    if (data.storeAddress) {
      parts.push(this.encode(data.storeAddress), COMMANDS.LINE);
    }
    if (data.storePhone) {
      parts.push(this.encode(`Tel: ${data.storePhone}`), COMMANDS.LINE);
    }
    if (data.storeNuit) {
      parts.push(this.encode(`NUIT: ${data.storeNuit}`), COMMANDS.LINE);
    }

    parts.push(
      this.separator('='),
      COMMANDS.BOLD_ON,
      this.encode('RECIBO DE VENDA'),
      COMMANDS.LINE,
      COMMANDS.BOLD_OFF,
      this.separator('='),
      COMMANDS.ALIGN_LEFT,
    );

    // Document info
    parts.push(
      this.twoColumns(`Nº: ${data.receiptNumber}`, data.date),
      this.twoColumns('Pagto:', paymentLabels[data.paymentMethod] || data.paymentMethod),
    );

    if (data.sellerName) {
      parts.push(this.twoColumns('Vendedor:', data.sellerName));
    }

    parts.push(this.separator('-'));

    // Items
    for (const item of data.items) {
      const name = item.name.length > 20 ? item.name.substring(0, 20) + '..' : item.name;
      parts.push(this.encode(name), COMMANDS.LINE);
      parts.push(
        this.twoColumns(
          `  ${item.quantity} x ${this.formatMoney(item.price)}`,
          this.formatMoney(item.total)
        )
      );
    }

    parts.push(this.separator('-'));

    // Totals
    parts.push(this.twoColumns('Subtotal:', this.formatMoney(data.subtotal)));

    if (data.discount > 0) {
      parts.push(this.twoColumns('Desconto:', `-${this.formatMoney(data.discount)}`));
    }

    parts.push(
      COMMANDS.BOLD_ON,
      COMMANDS.DOUBLE_HEIGHT,
    );
    parts.push(this.twoColumns('TOTAL:', this.formatMoney(data.total)));
    parts.push(COMMANDS.NORMAL_SIZE, COMMANDS.BOLD_OFF);

    if (data.amountReceived && data.amountReceived > data.total) {
      parts.push(
        this.twoColumns('Recebido:', this.formatMoney(data.amountReceived)),
        this.twoColumns('Troco:', this.formatMoney(data.change || 0)),
      );
    }

    // Footer
    parts.push(
      this.separator('='),
      COMMANDS.ALIGN_CENTER,
      this.encode('Obrigado pela preferência!'),
      COMMANDS.LINE,
      this.encode('NAVANHULA ERP'),
      COMMANDS.LINE,
      COMMANDS.FEED_LINES(4),
      COMMANDS.PARTIAL_CUT,
    );

    const receipt = this.concat(...parts);
    await this.sendData(receipt);
  }
}

// Singleton instance
export const bluetoothPrinter = new BluetoothPrinterService();
