import { lzwDecode, LzwDecoder } from './LzwDecoder.js';
import { bitsToNum, byteToBitArr } from './util.js';

/**
 * GIF Parser class.
 * Converted from the legacy ESM (./legacy/esm/parseGIF.js)
 * Used in "SuperGif".
 * @see ./legacy/esm/parseGIF.js
 */
export default class GifParser {
  #handler;
  #stream;

  get st () { return this.#stream; }
  get handler () { return this.#handler; }

  constructor (stream, handler) {
    this.#stream = stream;
    this.#handler = handler || {};
    console.assert(stream, 'ParseGIF missing stream');
    console.assert(typeof handler === 'object', 'ParseGIF missing handler');
    console.debug('GifParser:', this);
  }

  // handler.hdr && handler.hdr(hdr);
  #handle (key, data) {
    this.#handler[key] && this.#handler[key](data);
  }

  // handler.app && handler.app[block.identifier] && handler.app[block.identifier](block);
  #handleApp (blockId, blockData) {
    this.#handler.app && this.#handler.app[blockId] && this.#handler.app[blockId](blockData);
  }

  // LZW (GIF-specific)
  #parseCT (entries) { // Each entry is 3 bytes, for RGB.
      var ct = [];
      for (var i = 0; i < entries; i++) {
          ct.push(this.st.readBytes(3));
      }
      return ct;
  }

  #readSubBlocks () {
      var size, data;
      data = '';
      do {
          size = this.st.readByte();
          data += this.st.read(size);
      } while (size !== 0);
      return data;
  }

  #parseHeader () {
      var hdr = {};
      hdr.sig = this.st.read(3);
      hdr.ver = this.st.read(3);
      if (hdr.sig !== 'GIF') throw new Error('Not a GIF file.'); // XXX: This should probably be handled more nicely.
      hdr.width = this.st.readUnsigned();
      hdr.height = this.st.readUnsigned();

      var bits = byteToBitArr(this.st.readByte());
      hdr.gctFlag = bits.shift(); // GCT - Global Color Table.
      hdr.colorRes = bitsToNum(bits.splice(0, 3));
      hdr.sorted = bits.shift();
      hdr.gctSize = bitsToNum(bits.splice(0, 3));

      hdr.bgColor = this.st.readByte();
      hdr.pixelAspectRatio = this.st.readByte(); // if not 0, aspectRatio = (pixelAspectRatio + 15) / 64
      if (hdr.gctFlag) {
          hdr.gct = this.#parseCT(1 << (hdr.gctSize + 1));
      }

      this.#handle('hdr', hdr);
      // Was: handler.hdr && handler.hdr(hdr);
  } // End: #parseHeader.

  #parseGCExt (block) {
      var blockSize = this.st.readByte(); // Always 4
      var bits = byteToBitArr(this.st.readByte());
      block.reserved = bits.splice(0, 3); // Reserved; should be 000.
      block.disposalMethod = bitsToNum(bits.splice(0, 3));
      block.userInput = bits.shift();
      block.transparencyGiven = bits.shift();

      block.delayTime = this.st.readUnsigned();

      block.transparencyIndex = this.st.readByte();

      block.terminator = this.st.readByte();

      this.#handle('gce', block);
      // Was: handler.gce && handler.gce(block);
  }

  #parseComExt (block) {
      block.comment = this.#readSubBlocks();
      this.#handle('com', block);
      // handler.com && handler.com(block);
  }

  #parsePTExt (block) {
      // No one *ever* uses this. If you use it, deal with parsing it yourself.
      var blockSize = this.st.readByte(); // Always 12
      block.ptHeader = this.st.readBytes(12);
      block.ptData = this.#readSubBlocks();
      this.#handle('pte', block);

      // Was: handler.pte && handler.pte(block);
  }

  #parseNetscapeExt (block) {
      var blockSize = this.st.readByte(); // Always 3
      block.unknown = this.st.readByte(); // ??? Always 1? What is this?
      block.iterations = this.st.readUnsigned();
      block.terminator = this.st.readByte();

      this.#handleApp('NETSCAPE', block);
      // Was: handler.app && handler.app.NETSCAPE && handler.app.NETSCAPE(block);
  }

  #parseUnknownAppExt (block) {
      block.appData = this.#readSubBlocks();
      // FIXME: This won't work if a handler wants to match on any identifier.
      this.#handleApp(block.identifier, block);
      // Was: handler.app && handler.app[block.identifier] && handler.app[block.identifier](block);
  }

  #parseAppExt (block) {
      var blockSize = this.st.readByte(); // Always 11
      block.identifier = this.st.read(8);
      block.authCode = this.st.read(3);

      switch (block.identifier) {
          case 'NETSCAPE':
              this.#parseNetscapeExt(block);
              break;
          default:
              this.#parseUnknownAppExt(block);
              break;
      }
  }

  #parseUnknownExt (block) {
    block.data = this.#readSubBlocks();
    this.#handle('unknown', block);
    // Was: handler.unknown && handler.unknown(block);
  }

  #parseExt (block) {
    block.label = this.st.readByte();
    switch (block.label) {
        case 0xF9:
            block.extType = 'gce';
            this.#parseGCExt(block);
            break;
        case 0xFE:
            block.extType = 'com';
            this.#parseComExt(block);
            break;
        case 0x01:
            block.extType = 'pte';
            this.#parsePTExt(block);
            break;
        case 0xFF:
            block.extType = 'app';
            this.#parseAppExt(block);
            break;
        default:
            block.extType = 'unknown';
            this.#parseUnknownExt(block);
            break;
    }
  } // End: #parseExt.

  #deinterlace (pixels, width) {
      // Of course this defeats the purpose of interlacing. And it's *probably*
      // the least efficient way it's ever been implemented. But nevertheless...
      var newPixels = new Array(pixels.length);
      var rows = pixels.length / width;
      var cpRow = function (toRow, fromRow) {
          var fromPixels = pixels.slice(fromRow * width, (fromRow + 1) * width);
          newPixels.splice.apply(newPixels, [toRow * width, width].concat(fromPixels));
      };

      // See appendix E.
      var offsets = [0, 4, 2, 1];
      var steps = [8, 8, 4, 2];

      var fromRow = 0;
      for (var pass = 0; pass < 4; pass++) {
          for (var toRow = offsets[pass]; toRow < rows; toRow += steps[pass]) {
              cpRow(toRow, fromRow)
              fromRow++;
          }
      }

      return newPixels;
  } // End: #deinterlace.

  #parseImg (img) {
    img.leftPos = this.st.readUnsigned();
    img.topPos = this.st.readUnsigned();
    img.width = this.st.readUnsigned();
    img.height = this.st.readUnsigned();

    var bits = byteToBitArr(this.st.readByte());
    img.lctFlag = bits.shift();
    img.interlaced = bits.shift();
    img.sorted = bits.shift();
    img.reserved = bits.splice(0, 2);
    img.lctSize = bitsToNum(bits.splice(0, 3));

    if (img.lctFlag) {
        img.lct = this.#parseCT(1 << (img.lctSize + 1));
    }

    img.lzwMinCodeSize = this.st.readByte();

    var lzwData = this.#readSubBlocks();

    const decoder = new LzwDecoder(img.lzwMinCodeSize, lzwData);
    img.pixels = decoder.decode();
    // Was: img.pixels = lzwDecode(img.lzwMinCodeSize, lzwData);

    if (img.interlaced) { // Move
        img.pixels = this.#deinterlace(img.pixels, img.width);
    }

    this.#handle('img', img);
    // Was: handler.img && handler.img(img);
  } // End: #parseImg.

  #parseBlock () {
      var block = {};
      block.sentinel = this.st.readByte();

      switch (String.fromCharCode(block.sentinel)) { // For ease of matching
          case '!':
              block.type = 'ext';
              this.#parseExt(block);
              break;
          case ',':
              block.type = 'img';
              this.#parseImg(block);
              break;
          case ';':
              block.type = 'eof';
              this.#handle('eof', block);
              // Was: handler.eof && handler.eof(block);
              break;
          default:
              throw new Error('Unknown block: 0x' + block.sentinel.toString(16)); // TODO: Pad this with a 0.
      }

      if (block.type !== 'eof') { this.#parseNextBlock(); }
  } // End: #parseBlock.

  #parseNextBlock () {
    setTimeout(() => this.#parseBlock(), 0);
  }

  parse () {
    this.#parseHeader();
    this.#parseNextBlock();
  }
} // End: class GifParser.
