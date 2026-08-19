/**
 * Minimal Stream class.
 * Converted from the original "class" definition (below).
 * Used in "GifParser" / "parseGif".
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
}

// Stream
/**
 * @constructor
 */
// Make compiler happy.
var LegacyStream = function (data) {
    this.data = data;
    this.len = this.data.length;
    this.pos = 0;

    this.readByte = function () {
        if (this.pos >= this.data.length) {
            throw new Error('Attempted to read past end of stream.');
        }
        if (data instanceof Uint8Array)
            return data[this.pos++];
        else
            return data.charCodeAt(this.pos++) & 0xFF;
    };

    this.readBytes = function (n) {
        var bytes = [];
        for (var i = 0; i < n; i++) {
            bytes.push(this.readByte());
        }
        return bytes;
    };

    this.read = function (n) {
        var s = '';
        for (var i = 0; i < n; i++) {
            s += String.fromCharCode(this.readByte());
        }
        return s;
    };

    this.readUnsigned = function () { // Little-endian.
        var a = this.readBytes(2);
        return (a[1] << 8) + a[0];
    };
};

// export default Stream;
