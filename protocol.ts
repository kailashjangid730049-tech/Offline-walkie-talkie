import {Buffer} from 'buffer';

// Frame = [type u8][length u16 BE][payload]
export const MSG = {AUDIO: 1, PTT_START: 2, PTT_END: 3, PING: 4} as const;

export function encode(type: number, payload?: Buffer): Buffer {
  const len = payload ? payload.length : 0;
  const head = Buffer.alloc(3);
  head.writeUInt8(type, 0);
  head.writeUInt16BE(len, 1);
  return payload ? Buffer.concat([head, payload]) : head;
}

export class Decoder {
  private buf: Buffer = Buffer.alloc(0);
  push(chunk: Buffer, onFrame: (type: number, payload: Buffer) => void) {
    this.buf = Buffer.concat([this.buf, chunk]);
    while (this.buf.length >= 3) {
      const len = this.buf.readUInt16BE(1);
      if (this.buf.length < 3 + len) break;
      const type = this.buf.readUInt8(0);
      const payload = Buffer.from(this.buf.subarray(3, 3 + len));
      this.buf = Buffer.from(this.buf.subarray(3 + len));
      onFrame(type, payload);
    }
  }
}
