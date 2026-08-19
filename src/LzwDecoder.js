/**
 * LZW (Lempel–Ziv–Welch) decoder class.
 * Converted from the original "class" definition (below).
 * Used in "parseGif.parseImg" function.
 */
class LzwDecoder {
  // TODO: Now that the GIF parser is a bit different, maybe this should get an array of bytes instead of a String?
  #pos = 0; // Maybe this streaming thing should be merged with the Stream?
  #data;
  #minCodeSize;
  #dict = [];

  #clearCode;
  #eoiCode; // End of input?
  #codeSize;

  get pos () { return this.#pos; }

  constructor (minCodeSize, data) {
    console.assert(typeof minCodeSize === 'number', 'LzwDecoder missing minCodeSize');
    console.assert(typeof data === 'string', 'LzwDecoder missing data');

    this.#minCodeSize = parseInt(minCodeSize);
    this.#data = data;

    this.#clearCode = 1 << this.#minCodeSize;
    this.#eoiCode = this.#clearCode + 1;

    this.#codeSize = this.#minCodeSize + 1;
  }

  #readCode (size) {
      var code = 0;
      for (var i = 0; i < size; i++) {
          if (this.#data.charCodeAt(this.pos >> 3) & (1 << (this.pos & 7))) {
              code |= 1 << i;
          }
          this.#pos++;
      }
      return code;
  }

  #clear () {
      this.#dict = [];
      this.#codeSize = this.#minCodeSize + 1;

      for (var i = 0; i < this.#clearCode; i++) {
          this.#dict[i] = [i];
      }
      this.#dict[this.#clearCode] = [];
      this.#dict[this.#eoiCode] = null;
  }

  // Public method.
  decode () {
    var output = [];

    var code;
    var last;

    while (true) {
        last = code;
        code = this.#readCode(this.#codeSize);

        if (code === this.#clearCode) {
            this.#clear();
            continue;
        }
        if (code === this.#eoiCode) break;

        if (code < this.#dict.length) {
            if (last !== this.#clearCode) {
                this.#dict.push(this.#dict[last].concat(this.#dict[code][0]));
            }
        }
        else {
            if (code !== this.#dict.length) {
              throw new Error('Invalid LZW code.');
            }
            this.#dict.push(this.#dict[last].concat(this.#dict[last][0]));
        }
        output.push.apply(output, this.#dict[code]);

        if (this.#dict.length === (1 << this.#codeSize) && this.#codeSize < 12) {
            // If we're at the last code and codeSize is 12, the next code will be a clearCode, and it'll be 12 bits long.
            this.#codeSize++;
        }
    }

    // I don't know if this is technically an error, but some GIFs do it.
    //if (Math.ceil(pos / 8) !== data.length) throw new Error('Extraneous LZW bytes.');
    return output;
  }
} // End class.

/**
 * Legacy "lzwDecode" class.
 */
var lzwDecode = function (minCodeSize, data) {
    // TODO: Now that the GIF parser is a bit different, maybe this should get an array of bytes instead of a String?
    var pos = 0; // Maybe this streaming thing should be merged with the Stream?
    var readCode = function (size) {
        var code = 0;
        for (var i = 0; i < size; i++) {
            if (data.charCodeAt(pos >> 3) & (1 << (pos & 7))) {
                code |= 1 << i;
            }
            pos++;
        }
        return code;
    };

    var output = [];

    var clearCode = 1 << minCodeSize;
    var eoiCode = clearCode + 1;

    var codeSize = minCodeSize + 1;

    var dict = [];

    var clear = function () {
        dict = [];
        codeSize = minCodeSize + 1;
        for (var i = 0; i < clearCode; i++) {
            dict[i] = [i];
        }
        dict[clearCode] = [];
        dict[eoiCode] = null;

    };

    var code;
    var last;

    while (true) {
        last = code;
        code = readCode(codeSize);

        if (code === clearCode) {
            clear();
            continue;
        }
        if (code === eoiCode) break;

        if (code < dict.length) {
            if (last !== clearCode) {
                dict.push(dict[last].concat(dict[code][0]));
            }
        }
        else {
            if (code !== dict.length) throw new Error('Invalid LZW code.');
            dict.push(dict[last].concat(dict[last][0]));
        }
        output.push.apply(output, dict[code]);

        if (dict.length === (1 << codeSize) && codeSize < 12) {
            // If we're at the last code and codeSize is 12, the next code will be a clearCode, and it'll be 12 bits long.
            codeSize++;
        }
    }

    // I don't know if this is technically an error, but some GIFs do it.
    //if (Math.ceil(pos / 8) !== data.length) throw new Error('Extraneous LZW bytes.');
    return output;
};

export { lzwDecode, LzwDecoder };
