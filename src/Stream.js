/**
 * Minimal Stream class.
 * Converted from the legacy ESM (./legacy/esm/Stream.js)
 * Used in "GifParser" (parseGif)
 * @see ./legacy/esm/Stream.js
 */
export default class Stream {
  #data;
  #pos = 0;

  get pos () { return this.#pos; }
  // get len () { return this.#data.length; } // Backwards compatibility?
  get length () { return this.#data.length; }

  constructor (data) {
    this.#data = data;
    console.assert(typeof data === 'string', 'Stream missing data');
    console.debug('Stream class:', this);
  }

  readByte () {
        if (this.pos >= this.length) {
            throw new Error('Attempted to read past end of stream.');
        }
        if (this.#data instanceof Uint8Array) {
            return this.#data[this.#pos++];
        } else {
            return this.#data.charCodeAt(this.#pos++) & 0xFF;
        }
    }

    readBytes (n) {
        var bytes = [];
        for (var i = 0; i < n; i++) {
            bytes.push(this.readByte());
        }
        return bytes;
    }

    read (n) {
        var s = '';
        for (var i = 0; i < n; i++) {
            s += String.fromCharCode(this.readByte());
        }
        return s;
    }

    readUnsigned () { // Little-endian.
        var a = this.readBytes(2);
        return (a[1] << 8) + a[0];
    }
} // End: class Stream.
