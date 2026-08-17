import SuperGif from './src/SuperGif.js';
import lzwDecode from './src/LzwDecoder.js';
import parseGIF from './src/GifParser.js';
import Stream from './src/Stream.js';
import { bitsToNum, byteToBitArr } from './src/util.js';

export { SuperGif, lzwDecode, parseGIF, Stream, bitsToNum, byteToBitArr };
export default SuperGif;
