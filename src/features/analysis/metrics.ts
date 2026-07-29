/**
 * Skin-analysis pipeline — pure functions.
 *
 * Nothing in this file touches a camera, a native module, the filesystem, a
 * clock or a random number generator. Every export is a deterministic function
 * of its arguments, so all of it can be exercised in plain Node with a
 * hand-built buffer. That is the point: the arithmetic that produces numbers
 * about someone's skin should be inspectable without a device in hand.
 *
 * Layout:
 *   1. base64        — decode without relying on an `atob` global
 *   2. INFLATE       — RFC 1951, because a PNG is a compressed container
 *   3. PNG           — RFC 2083, to RGBA
 *   4. Statistics    — the exact figures
 *   5. Proxies       — the [E] rescaling to 0-100
 *   6. Quality       — whether the frame was worth measuring
 *   7. Assembly      — statistics + proxies + quality into a SkinReading
 *
 * WHY SECTIONS 1-3 EXIST AT ALL. expo-image-manipulator can resize an image
 * and hand back base64, but the base64 is of an ENCODED PNG or JPEG — the
 * package exposes no raw pixel access in SDK 57 (see `analyzer.ts`). Since
 * house rule 3 forbids new dependencies, the decode is written out here. It is
 * ordinary, checkable, standards-defined code; none of it is guesswork, which
 * is why the constants in these sections are marked [M] against their RFCs.
 *
 * Provenance: [M] measured / from a published standard, [D] derived,
 * [E] estimated. See `types.ts` for why so much of section 5 is [E].
 */

import {
  AnalysisError,
  HEURISTIC_DISCLAIMER,
  LUMA_COEFFICIENTS,
  type CaptureQuality,
  type CaptureQualityFlag,
  type HeuristicSkinReading,
  type ImageStatistics,
  type ProxyBand,
  type ProxyKind,
  type ProxyScore,
  type ProxySet,
  type RgbaBitmap,
  type StatisticKey,
} from './types';

/* ========================================================================== */
/* 1. base64                                                                  */
/* ========================================================================== */

/**
 * [M] RFC 4648 §4 standard alphabet.
 *
 * Written out rather than calling `atob`: `atob` is a DOM global, and whether
 * it exists in a React Native runtime depends on the polyfill set of the day.
 * A 20-line decoder removes that from the list of things that can break in
 * someone's hands.
 */
const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const BASE64_LOOKUP: Int16Array = (() => {
  const table = new Int16Array(128).fill(-1);
  for (let i = 0; i < BASE64_ALPHABET.length; i++) {
    table[BASE64_ALPHABET.charCodeAt(i)] = i;
  }
  return table;
})();

/**
 * Decode standard base64 to bytes.
 *
 * Tolerates whitespace, `=` padding, and a `data:…;base64,` prefix, because
 * all three turn up depending on how the payload was produced. Rejects any
 * other character rather than skipping it: silently dropping a byte would
 * corrupt the image and the corruption would surface much later, as a number.
 */
export function decodeBase64(input: string): Uint8Array {
  const comma = input.indexOf(',');
  const body =
    comma !== -1 && input.lastIndexOf('data:', 0) === 0
      ? input.slice(comma + 1)
      : input;

  // First pass: count real symbols so the output can be sized exactly.
  let symbols = 0;
  for (let i = 0; i < body.length; i++) {
    const code = body.charCodeAt(i);
    if (code === 61) break; // '=' — padding, and nothing meaningful follows
    if (code === 32 || code === 9 || code === 10 || code === 13) continue;
    if (code >= 128 || BASE64_LOOKUP[code] === -1) {
      throw new AnalysisError(
        'image-decode-failed',
        `Not valid base64: unexpected character at index ${i}.`
      );
    }
    symbols++;
  }

  const out = new Uint8Array(Math.floor((symbols * 3) / 4));
  let acc = 0;
  let accBits = 0;
  let written = 0;

  for (let i = 0; i < body.length; i++) {
    const code = body.charCodeAt(i);
    if (code === 61) break;
    if (code === 32 || code === 9 || code === 10 || code === 13) continue;
    acc = (acc << 6) | BASE64_LOOKUP[code];
    accBits += 6;
    if (accBits >= 8) {
      accBits -= 8;
      out[written++] = (acc >> accBits) & 0xff;
    }
  }

  return out;
}

/* ========================================================================== */
/* 2. INFLATE (RFC 1951)                                                      */
/* ========================================================================== */

/** [M] RFC 1951 §3.2.7 — maximum Huffman code length in DEFLATE. */
const MAX_CODE_BITS = 15;

/** [M] RFC 1951 §3.2.7 — the order code-length codes are transmitted in. */
const CODE_LENGTH_ORDER = [
  16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15,
] as const;

/** [M] RFC 1951 §3.2.5 — length codes 257-285: base value and extra bits. */
const LENGTH_BASE = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67,
  83, 99, 115, 131, 163, 195, 227, 258,
] as const;
const LENGTH_EXTRA_BITS = [
  0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5,
  5, 5, 0,
] as const;

/** [M] RFC 1951 §3.2.5 — distance codes 0-29: base value and extra bits. */
const DISTANCE_BASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769,
  1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577,
] as const;
const DISTANCE_EXTRA_BITS = [
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11,
  11, 12, 12, 13, 13,
] as const;

/** [M] RFC 1951 §3.2.1 — end-of-block symbol. */
const END_OF_BLOCK = 256;

/**
 * A canonical Huffman table in counts/symbols form.
 *
 * This is the representation used by zlib's own reference decoder (`puff`).
 * It decodes one bit at a time — slower than a lookup table, and completely
 * adequate here: the payload is a 64x64 image, about 12 KB before compression.
 * Correctness that a reader can follow beats throughput nobody will notice.
 */
interface HuffmanTable {
  /** `counts[n]` = how many symbols have a code of length `n`. */
  readonly counts: Int32Array;
  /** Symbols ordered by (code length, symbol value). */
  readonly symbols: Int32Array;
}

function buildHuffmanTable(lengths: ArrayLike<number>): HuffmanTable {
  const counts = new Int32Array(MAX_CODE_BITS + 1);
  for (let i = 0; i < lengths.length; i++) counts[lengths[i]]++;
  counts[0] = 0;

  const offsets = new Int32Array(MAX_CODE_BITS + 2);
  for (let len = 1; len <= MAX_CODE_BITS; len++) {
    offsets[len + 1] = offsets[len] + counts[len];
  }

  const symbols = new Int32Array(lengths.length);
  for (let symbol = 0; symbol < lengths.length; symbol++) {
    const len = lengths[symbol];
    if (len !== 0) symbols[offsets[len]++] = symbol;
  }

  return { counts, symbols };
}

/** LSB-first bit reader over a byte array. */
class BitReader {
  private byteIndex: number;
  private buffer = 0;
  private bufferedBits = 0;

  constructor(
    private readonly data: Uint8Array,
    start: number
  ) {
    this.byteIndex = start;
  }

  /** Read `count` bits (0-15), least-significant first. */
  read(count: number): number {
    let value = this.buffer;
    while (this.bufferedBits < count) {
      if (this.byteIndex >= this.data.length) {
        throw new AnalysisError(
          'image-decode-failed',
          'Compressed image data ended mid-stream.'
        );
      }
      value |= this.data[this.byteIndex++] << this.bufferedBits;
      this.bufferedBits += 8;
    }
    this.buffer = value >>> count;
    this.bufferedBits -= count;
    return value & ((1 << count) - 1);
  }

  /**
   * Discard the partial byte. Safe because `read` never leaves more than 7
   * bits buffered, so the next whole byte is always at `byteIndex`.
   */
  alignToByte(): void {
    this.buffer = 0;
    this.bufferedBits = 0;
  }

  readAlignedByte(): number {
    if (this.byteIndex >= this.data.length) {
      throw new AnalysisError(
        'image-decode-failed',
        'Compressed image data ended inside an uncompressed block.'
      );
    }
    return this.data[this.byteIndex++];
  }

  copyAlignedBytes(target: Uint8Array, at: number, count: number): void {
    if (this.byteIndex + count > this.data.length) {
      throw new AnalysisError(
        'image-decode-failed',
        'Uncompressed block runs past the end of the image data.'
      );
    }
    target.set(this.data.subarray(this.byteIndex, this.byteIndex + count), at);
    this.byteIndex += count;
  }
}

function decodeSymbol(reader: BitReader, table: HuffmanTable): number {
  let code = 0;
  let first = 0;
  let index = 0;

  for (let len = 1; len <= MAX_CODE_BITS; len++) {
    code |= reader.read(1);
    const count = table.counts[len];
    if (code - first < count) return table.symbols[index + (code - first)];
    index += count;
    first = (first + count) << 1;
    code <<= 1;
  }

  throw new AnalysisError(
    'image-decode-failed',
    'Invalid Huffman code in compressed image data.'
  );
}

/** [M] RFC 1951 §3.2.6 — the fixed literal/length code lengths. */
const FIXED_LITERAL_TABLE: HuffmanTable = (() => {
  const lengths = new Uint8Array(288);
  lengths.fill(8, 0, 144);
  lengths.fill(9, 144, 256);
  lengths.fill(7, 256, 280);
  lengths.fill(8, 280, 288);
  return buildHuffmanTable(lengths);
})();

/** [M] RFC 1951 §3.2.6 — fixed distance codes are all 5 bits. */
const FIXED_DISTANCE_TABLE: HuffmanTable = buildHuffmanTable(
  new Uint8Array(30).fill(5)
);

function readDynamicTables(reader: BitReader): {
  literals: HuffmanTable;
  distances: HuffmanTable;
} {
  const literalCount = reader.read(5) + 257;
  const distanceCount = reader.read(5) + 1;
  const codeLengthCount = reader.read(4) + 4;

  const codeLengthLengths = new Uint8Array(19);
  for (let i = 0; i < codeLengthCount; i++) {
    codeLengthLengths[CODE_LENGTH_ORDER[i]] = reader.read(3);
  }
  const codeLengthTable = buildHuffmanTable(codeLengthLengths);

  const lengths = new Uint8Array(literalCount + distanceCount);
  let i = 0;
  while (i < lengths.length) {
    const symbol = decodeSymbol(reader, codeLengthTable);
    if (symbol < 16) {
      lengths[i++] = symbol;
      continue;
    }

    let repeat: number;
    let value = 0;
    if (symbol === 16) {
      if (i === 0) {
        throw new AnalysisError(
          'image-decode-failed',
          'Compressed image data repeats a code length before defining one.'
        );
      }
      value = lengths[i - 1];
      repeat = 3 + reader.read(2);
    } else if (symbol === 17) {
      repeat = 3 + reader.read(3);
    } else {
      repeat = 11 + reader.read(7);
    }

    if (i + repeat > lengths.length) {
      throw new AnalysisError(
        'image-decode-failed',
        'Code-length run overflows the code table.'
      );
    }
    for (let n = 0; n < repeat; n++) lengths[i++] = value;
  }

  return {
    literals: buildHuffmanTable(lengths.subarray(0, literalCount)),
    distances: buildHuffmanTable(lengths.subarray(literalCount)),
  };
}

/**
 * INFLATE a raw DEFLATE stream into a buffer of exactly `expectedLength`.
 *
 * The exact size is known ahead of time for a PNG (see {@link decodePng}),
 * which removes any need for a growable buffer and turns "the stream produced
 * more data than the header promised" into a caught error rather than silent
 * corruption.
 */
export function inflateRaw(
  data: Uint8Array,
  start: number,
  expectedLength: number
): Uint8Array {
  const reader = new BitReader(data, start);
  const out = new Uint8Array(expectedLength);
  let written = 0;

  for (;;) {
    const isFinal = reader.read(1);
    const type = reader.read(2);

    if (type === 0) {
      reader.alignToByte();
      const low = reader.readAlignedByte();
      const high = reader.readAlignedByte();
      const length = low | (high << 8);
      // Skip NLEN; it is the one's complement of LEN and adds nothing given
      // that an overlong copy is already rejected below.
      reader.readAlignedByte();
      reader.readAlignedByte();
      if (written + length > expectedLength) {
        throw new AnalysisError(
          'image-decode-failed',
          'Image data is longer than its header declares.'
        );
      }
      reader.copyAlignedBytes(out, written, length);
      written += length;
    } else if (type === 1 || type === 2) {
      const tables =
        type === 1
          ? { literals: FIXED_LITERAL_TABLE, distances: FIXED_DISTANCE_TABLE }
          : readDynamicTables(reader);

      for (;;) {
        const symbol = decodeSymbol(reader, tables.literals);

        if (symbol === END_OF_BLOCK) break;

        if (symbol < END_OF_BLOCK) {
          if (written >= expectedLength) {
            throw new AnalysisError(
              'image-decode-failed',
              'Image data is longer than its header declares.'
            );
          }
          out[written++] = symbol;
          continue;
        }

        const lengthIndex = symbol - 257;
        if (lengthIndex >= LENGTH_BASE.length) {
          throw new AnalysisError(
            'image-decode-failed',
            `Invalid length symbol ${symbol} in image data.`
          );
        }
        const copyLength =
          LENGTH_BASE[lengthIndex] + reader.read(LENGTH_EXTRA_BITS[lengthIndex]);

        const distanceIndex = decodeSymbol(reader, tables.distances);
        if (distanceIndex >= DISTANCE_BASE.length) {
          throw new AnalysisError(
            'image-decode-failed',
            `Invalid distance symbol ${distanceIndex} in image data.`
          );
        }
        const distance =
          DISTANCE_BASE[distanceIndex] +
          reader.read(DISTANCE_EXTRA_BITS[distanceIndex]);

        if (distance > written) {
          throw new AnalysisError(
            'image-decode-failed',
            'Image data references bytes before the start of the stream.'
          );
        }
        if (written + copyLength > expectedLength) {
          throw new AnalysisError(
            'image-decode-failed',
            'Image data is longer than its header declares.'
          );
        }

        // Byte-at-a-time on purpose: DEFLATE back-references are allowed to
        // overlap the bytes they are still writing (that is how runs are
        // encoded), so a bulk copy would be wrong.
        let from = written - distance;
        for (let n = 0; n < copyLength; n++) out[written++] = out[from++];
      }
    } else {
      throw new AnalysisError(
        'image-decode-failed',
        'Reserved block type in compressed image data.'
      );
    }

    if (isFinal) break;
  }

  if (written !== expectedLength) {
    throw new AnalysisError(
      'image-decode-failed',
      `Image data is ${written} bytes; its header declares ${expectedLength}.`
    );
  }

  return out;
}

/** [M] RFC 1950 §2.2 — zlib wrapper: 2-byte header, then a DEFLATE stream. */
function inflateZlib(data: Uint8Array, expectedLength: number): Uint8Array {
  if (data.length < 2) {
    throw new AnalysisError('image-decode-failed', 'Image data is truncated.');
  }
  const cmf = data[0];
  const flg = data[1];

  if ((cmf & 0x0f) !== 8) {
    throw new AnalysisError(
      'unsupported-image-format',
      `Image uses compression method ${cmf & 0x0f}; only DEFLATE is supported.`
    );
  }
  if (((cmf << 8) | flg) % 31 !== 0) {
    throw new AnalysisError(
      'image-decode-failed',
      'Image compression header failed its checksum.'
    );
  }
  if ((flg >> 5) & 1) {
    throw new AnalysisError(
      'unsupported-image-format',
      'Image data uses a preset dictionary, which is not supported.'
    );
  }

  // The trailing Adler-32 is not verified. The payload is produced and
  // consumed inside this process; a corruption between the two would be a
  // platform bug, and the structural checks above already reject garbage.
  return inflateRaw(data, 2, expectedLength);
}

/* ========================================================================== */
/* 3. PNG (RFC 2083)                                                          */
/* ========================================================================== */

/** [M] RFC 2083 §3.1 — the 8-byte PNG signature. */
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

/** [M] RFC 2083 §4.1.1 — samples per pixel, by colour type. */
const CHANNELS_BY_COLOUR_TYPE: Readonly<Record<number, number>> = {
  0: 1, // greyscale
  2: 3, // truecolour
  3: 1, // indexed
  4: 2, // greyscale + alpha
  6: 4, // truecolour + alpha
};

function readUint32BE(data: Uint8Array, at: number): number {
  return (
    data[at] * 0x1000000 +
    (data[at + 1] << 16) +
    (data[at + 2] << 8) +
    data[at + 3]
  );
}

/** [M] RFC 2083 §6 — the Paeth predictor, transcribed from the spec. */
function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Decode a PNG byte stream to RGBA.
 *
 * SUPPORTED: bit depths 1/2/4/8/16, colour types 0, 2, 3, 4 and 6,
 * non-interlaced, with `PLTE` and palette `tRNS`. That is everything a
 * platform PNG encoder produces; in practice `saveAsync` yields 8-bit
 * truecolour with or without alpha.
 *
 * NOT SUPPORTED: Adam7 interlacing, and colour-key `tRNS` for colour types 0
 * and 2 (those pixels come back opaque). Both are rejected or documented
 * rather than approximated — see the errors below.
 *
 * Chunk CRCs are not verified. Nothing here trusts the data: every length is
 * bounds-checked and the inflate output must match the size the header
 * declares, so a corrupt stream fails loudly rather than producing pixels.
 */
export function decodePng(bytes: Uint8Array): RgbaBitmap {
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) {
      throw new AnalysisError(
        'unsupported-image-format',
        'Image is not a PNG. Only PNG can be decoded in-app; see analyzer.ts.'
      );
    }
  }

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colourType = 0;
  let palette: Uint8Array | null = null;
  let paletteAlpha: Uint8Array | null = null;
  const idatParts: Uint8Array[] = [];
  let sawHeader = false;

  let offset = PNG_SIGNATURE.length;
  while (offset + 8 <= bytes.length) {
    const length = readUint32BE(bytes, offset);
    const type =
      String.fromCharCode(bytes[offset + 4]) +
      String.fromCharCode(bytes[offset + 5]) +
      String.fromCharCode(bytes[offset + 6]) +
      String.fromCharCode(bytes[offset + 7]);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (dataEnd + 4 > bytes.length) {
      throw new AnalysisError(
        'image-decode-failed',
        `PNG chunk "${type}" runs past the end of the file.`
      );
    }

    if (type === 'IHDR') {
      width = readUint32BE(bytes, dataStart);
      height = readUint32BE(bytes, dataStart + 4);
      bitDepth = bytes[dataStart + 8];
      colourType = bytes[dataStart + 9];
      const interlace = bytes[dataStart + 12];
      if (interlace !== 0) {
        throw new AnalysisError(
          'unsupported-image-format',
          'Interlaced PNGs are not supported. Re-encode without Adam7.'
        );
      }
      if (CHANNELS_BY_COLOUR_TYPE[colourType] === undefined) {
        throw new AnalysisError(
          'unsupported-image-format',
          `PNG colour type ${colourType} is not a valid type.`
        );
      }
      if (![1, 2, 4, 8, 16].includes(bitDepth)) {
        throw new AnalysisError(
          'unsupported-image-format',
          `PNG bit depth ${bitDepth} is not a valid depth.`
        );
      }
      sawHeader = true;
    } else if (type === 'PLTE') {
      palette = bytes.subarray(dataStart, dataEnd);
    } else if (type === 'tRNS') {
      if (colourType === 3) paletteAlpha = bytes.subarray(dataStart, dataEnd);
      // Colour-key transparency for types 0 and 2 is ignored: those pixels
      // stay opaque. It cannot occur in a photograph re-encoded by the OS.
    } else if (type === 'IDAT') {
      idatParts.push(bytes.subarray(dataStart, dataEnd));
    } else if (type === 'IEND') {
      break;
    }

    offset = dataEnd + 4; // skip the chunk CRC
  }

  if (!sawHeader) {
    throw new AnalysisError('image-decode-failed', 'PNG has no IHDR chunk.');
  }
  if (width <= 0 || height <= 0) {
    throw new AnalysisError('empty-image', 'PNG declares zero-size dimensions.');
  }
  if (idatParts.length === 0) {
    throw new AnalysisError('image-decode-failed', 'PNG has no image data.');
  }
  if (colourType === 3 && palette === null) {
    throw new AnalysisError(
      'image-decode-failed',
      'Indexed PNG has no palette.'
    );
  }

  let compressed: Uint8Array;
  if (idatParts.length === 1) {
    compressed = idatParts[0];
  } else {
    let total = 0;
    for (const part of idatParts) total += part.length;
    compressed = new Uint8Array(total);
    let at = 0;
    for (const part of idatParts) {
      compressed.set(part, at);
      at += part.length;
    }
  }

  const channels = CHANNELS_BY_COLOUR_TYPE[colourType];
  const bitsPerPixel = channels * bitDepth;
  const bytesPerRow = Math.ceil((width * bitsPerPixel) / 8);
  // Filters operate on whole bytes; for sub-byte depths the spec fixes the
  // filter unit at one byte (RFC 2083 §6.3).
  const filterUnit = Math.max(1, bitsPerPixel >> 3);

  const raw = inflateZlib(compressed, height * (bytesPerRow + 1));

  /* -- Undo the per-scanline filters (RFC 2083 §6) -- */

  const lines = new Uint8Array(height * bytesPerRow);
  for (let y = 0; y < height; y++) {
    const filterType = raw[y * (bytesPerRow + 1)];
    const from = y * (bytesPerRow + 1) + 1;
    const to = y * bytesPerRow;
    const above = to - bytesPerRow;

    for (let x = 0; x < bytesPerRow; x++) {
      const value = raw[from + x];
      const left = x >= filterUnit ? lines[to + x - filterUnit] : 0;
      const up = y > 0 ? lines[above + x] : 0;
      const upLeft = y > 0 && x >= filterUnit ? lines[above + x - filterUnit] : 0;

      let restored: number;
      switch (filterType) {
        case 0:
          restored = value;
          break;
        case 1:
          restored = value + left;
          break;
        case 2:
          restored = value + up;
          break;
        case 3:
          restored = value + ((left + up) >> 1);
          break;
        case 4:
          restored = value + paethPredictor(left, up, upLeft);
          break;
        default:
          throw new AnalysisError(
            'image-decode-failed',
            `Unknown PNG filter type ${filterType} on row ${y}.`
          );
      }
      lines[to + x] = restored & 0xff;
    }
  }

  /* -- Expand samples to 8-bit RGBA -- */

  const out = new Uint8ClampedArray(width * height * 4);
  const maxSample = (1 << bitDepth) - 1;
  // Scale a sub-8-bit sample to 0-255 without a divide: depth 1 -> 255,
  // 2 -> 85, 4 -> 17. Exact, because 255 is divisible by each maximum.
  const subByteScale = bitDepth < 8 ? 255 / maxSample : 1;

  const sampleAt = (rowStart: number, index: number): number => {
    if (bitDepth === 8) return lines[rowStart + index];
    if (bitDepth === 16) return lines[rowStart + index * 2]; // high byte
    const bitPosition = index * bitDepth;
    const byte = lines[rowStart + (bitPosition >> 3)];
    const shift = 8 - bitDepth - (bitPosition & 7);
    return (byte >> shift) & maxSample;
  };

  for (let y = 0; y < height; y++) {
    const rowStart = y * bytesPerRow;
    for (let x = 0; x < width; x++) {
      const base = x * channels;
      const target = (y * width + x) * 4;

      let r: number;
      let g: number;
      let b: number;
      let a = 255;

      switch (colourType) {
        case 0: {
          const grey = sampleAt(rowStart, base) * subByteScale;
          r = grey;
          g = grey;
          b = grey;
          break;
        }
        case 2:
          r = sampleAt(rowStart, base);
          g = sampleAt(rowStart, base + 1);
          b = sampleAt(rowStart, base + 2);
          break;
        case 3: {
          const index = sampleAt(rowStart, base);
          // `palette` is non-null here: checked above for colour type 3.
          const plte = palette as Uint8Array;
          if (index * 3 + 2 >= plte.length) {
            throw new AnalysisError(
              'image-decode-failed',
              `Palette index ${index} is outside the palette.`
            );
          }
          r = plte[index * 3];
          g = plte[index * 3 + 1];
          b = plte[index * 3 + 2];
          if (paletteAlpha !== null && index < paletteAlpha.length) {
            a = paletteAlpha[index];
          }
          break;
        }
        case 4: {
          const grey = sampleAt(rowStart, base) * subByteScale;
          r = grey;
          g = grey;
          b = grey;
          a = sampleAt(rowStart, base + 1) * subByteScale;
          break;
        }
        default: {
          r = sampleAt(rowStart, base);
          g = sampleAt(rowStart, base + 1);
          b = sampleAt(rowStart, base + 2);
          a = sampleAt(rowStart, base + 3);
          break;
        }
      }

      out[target] = r;
      out[target + 1] = g;
      out[target + 2] = b;
      out[target + 3] = a;
    }
  }

  return { data: out, width, height };
}

/* ========================================================================== */
/* 4. Statistics                                                              */
/* ========================================================================== */

/**
 * [E] A pixel counts as clipped-high when EVERY channel is at or above this.
 *     250/255 leaves a little room for the rounding an encoder introduces,
 *     while still only catching pixels with no recoverable detail left.
 */
export const CLIP_HIGH_THRESHOLD = 250 / 255;

/**
 * [E] …and clipped-low when every channel is at or below this. 6/255 is just
 *     above the noise floor of a phone sensor in a dim room.
 */
export const CLIP_LOW_THRESHOLD = 6 / 255;

/**
 * [E] Alpha at or below this means the pixel is transparent and is excluded.
 *     A photograph has none; this only guards against a caller passing a
 *     composited or masked buffer, where averaging in transparent pixels
 *     would drag every statistic toward whatever the padding colour is.
 */
export const ALPHA_SAMPLE_THRESHOLD = 8;

/** Rec. 709 luma of one gamma-encoded sRGB pixel, on 0-1. */
function luma(r: number, g: number, b: number): number {
  return (
    (LUMA_COEFFICIENTS.red * r +
      LUMA_COEFFICIENTS.green * g +
      LUMA_COEFFICIENTS.blue * b) /
    255
  );
}

function assertBitmap(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): void {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new AnalysisError(
      'empty-image',
      `Bitmap dimensions must be positive integers; got ${width}x${height}.`
    );
  }
  if (rgba.length !== width * height * 4) {
    throw new AnalysisError(
      'empty-image',
      `Bitmap is ${rgba.length} bytes; ${width}x${height} RGBA needs ${
        width * height * 4
      }.`
    );
  }
}

/**
 * Compute every exact statistic in one pass over the buffer (plus one
 * neighbourhood pass for local contrast).
 *
 * Pure and deterministic: same bytes in, same numbers out, on every platform.
 * No sampling, no shortcuts, no floating-point accumulation tricks that would
 * make the result depend on iteration order.
 */
export function computeImageStatistics(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): ImageStatistics {
  assertBitmap(rgba, width, height);

  const lumaField = new Float64Array(width * height);
  const opaque = new Uint8Array(width * height);

  let sampleCount = 0;
  let sumLuma = 0;
  let sumLumaSquared = 0;
  let sumRed = 0;
  let sumGreen = 0;
  let sumBlue = 0;
  let sumRedness = 0;
  let clippedHigh = 0;
  let clippedLow = 0;

  for (let i = 0, p = 0; p < lumaField.length; p++, i += 4) {
    const r = rgba[i] / 255;
    const g = rgba[i + 1] / 255;
    const b = rgba[i + 2] / 255;
    const y = luma(rgba[i], rgba[i + 1], rgba[i + 2]);

    lumaField[p] = y;

    if (rgba[i + 3] <= ALPHA_SAMPLE_THRESHOLD) continue;
    opaque[p] = 1;
    sampleCount++;

    sumLuma += y;
    sumLumaSquared += y * y;
    sumRed += r;
    sumGreen += g;
    sumBlue += b;
    sumRedness += r - (g + b) / 2;

    if (
      r >= CLIP_HIGH_THRESHOLD &&
      g >= CLIP_HIGH_THRESHOLD &&
      b >= CLIP_HIGH_THRESHOLD
    ) {
      clippedHigh++;
    } else if (
      r <= CLIP_LOW_THRESHOLD &&
      g <= CLIP_LOW_THRESHOLD &&
      b <= CLIP_LOW_THRESHOLD
    ) {
      clippedLow++;
    }
  }

  if (sampleCount === 0) {
    throw new AnalysisError(
      'empty-image',
      'Every pixel in the bitmap is transparent; there is nothing to measure.'
    );
  }

  const meanLuminance = sumLuma / sampleCount;
  // Population variance via E[Y²] - E[Y]². Clamped at zero because floating
  // point can land a hair below it when every pixel is identical.
  const variance = Math.max(0, sumLumaSquared / sampleCount - meanLuminance ** 2);

  const channelMeans = {
    red: sumRed / sampleCount,
    green: sumGreen / sampleCount,
    blue: sumBlue / sampleCount,
  };
  const channelSpread =
    Math.max(channelMeans.red, channelMeans.green, channelMeans.blue) -
    Math.min(channelMeans.red, channelMeans.green, channelMeans.blue);

  return {
    meanLuminance,
    luminanceStdDev: Math.sqrt(variance),
    localContrast: computeLocalContrast(lumaField, opaque, width, height),
    rednessSeparation: sumRedness / sampleCount,
    channelMeans,
    channelSpread,
    clippedHighFraction: clippedHigh / sampleCount,
    clippedLowFraction: clippedLow / sampleCount,
    sampleCount,
    width,
    height,
  };
}

/**
 * Mean |Y' - mean(3x3 neighbourhood)| over interior pixels.
 *
 * The 3x3 window is the smallest one that has a centre, so it responds to
 * pixel-scale structure and nothing coarser. Edge pixels are skipped rather
 * than padded: padding invents neighbours, and inventing data to make a
 * statistic tidier is how a measurement stops being one.
 *
 * A buffer narrower or shorter than 3 pixels has no interior, and the answer
 * is 0 — genuinely "no local contrast was measurable", not a fabricated value.
 */
function computeLocalContrast(
  lumaField: Float64Array,
  opaque: Uint8Array,
  width: number,
  height: number
): number {
  if (width < 3 || height < 3) return 0;

  let total = 0;
  let counted = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const centre = y * width + x;
      if (!opaque[centre]) continue;

      let sum = 0;
      let n = 0;
      let anyTransparent = false;
      for (let dy = -1; dy <= 1; dy++) {
        const row = (y + dy) * width;
        for (let dx = -1; dx <= 1; dx++) {
          const at = row + x + dx;
          if (!opaque[at]) {
            anyTransparent = true;
            break;
          }
          sum += lumaField[at];
          n++;
        }
        if (anyTransparent) break;
      }
      if (anyTransparent) continue;

      total += Math.abs(lumaField[centre] - sum / n);
      counted++;
    }
  }

  return counted === 0 ? 0 : total / counted;
}

/* ========================================================================== */
/* 5. Proxies — the [E] layer                                                 */
/* ========================================================================== */

/**
 * One linear ramp from a statistic to a 0-100 score.
 *
 * `at0` and `at100` are the statistic values that map to the ends. `at0` may
 * be the larger of the two, which inverts the ramp — that is how "less spread
 * means more even" is expressed.
 */
interface ProxyRamp {
  readonly derivedFrom: StatisticKey;
  readonly at0: number;
  readonly at100: number;
}

/**
 * [E] EVERY NUMBER IN THIS TABLE IS A GUESS, AND THE MOST IMPORTANT THING TO
 *     KNOW ABOUT THIS SUBSYSTEM IS THAT IT IS A GUESS.
 *
 * These anchors decide only where a needle sits on a dial. They were chosen to
 * place the ramp over the part of each statistic's range where photographs
 * actually live, so that the dial moves visibly instead of pinning at one end.
 * They were NOT fitted to a capture set, they encode no population norm, and
 * two people with the same score have nothing in common except an arithmetic
 * coincidence about their photographs.
 *
 * Consequences that must be respected until they are re-anchored against real
 * data:
 *   - No copy may say a score is good, bad, normal, improved or worsening.
 *   - No score may be compared between people.
 *   - Scores may only be compared across time for one person if the
 *     `analyzerVersion` matches AND both frames were captured in comparable
 *     light — which the app cannot currently verify.
 *
 * Moving any value here is a behaviour change: bump `HEURISTIC_ANALYZER_VERSION`
 * in `analyzer.ts` so old readings are not silently plotted against new ones.
 */
const PROXY_RAMPS: Readonly<Record<ProxyKind, ProxyRamp>> = {
  /**
   * [E] Exact rescale, not a fitted ramp: mean luma is already 0-1, so 0 and 1
   *     are its true endpoints and no judgement enters.
   */
  brightness: { derivedFrom: 'meanLuminance', at0: 0, at100: 1 },

  /**
   * [E] Inverted: less luma spread scores higher. 0.02 and 0.28 bracket the
   *     low end of the statistic's 0-0.5 theoretical range, where photographic
   *     variation sits; anchoring at the theoretical ends instead would pin
   *     every real frame near 100 and make the dial useless.
   */
  evenness: { derivedFrom: 'luminanceStdDev', at0: 0.28, at100: 0.02 },

  /**
   * [E] Red separation runs -1 to +1 in theory. Skin tones and most indoor
   *     light hold it positive but small, so the ramp covers 0 to 0.25.
   *     Slightly negative frames (cool light, blue clothing) clamp to 0.
   */
  redness: { derivedFrom: 'rednessSeparation', at0: 0, at100: 0.25 },

  /**
   * [E] Local contrast on a downscaled frame is small. 0.002 is about what a
   *     flat, defocused surface yields; 0.08 is a sharp, well-lit frame with
   *     visible pixel-scale structure. Downscaling itself suppresses this
   *     statistic, so the ramp is tied to the sample size in `analyzer.ts` —
   *     change one and the other must be re-anchored.
   */
  textureProminence: { derivedFrom: 'localContrast', at0: 0.002, at100: 0.08 },
};

/**
 * [E] Band cut points on the 0-100 scale: even thirds.
 *
 * Even thirds because there is no evidence to justify anything else. A
 * lopsided split would imply knowledge about the distribution of these scores
 * that nobody here has.
 */
export const BAND_LOW_CEILING = 33.3;
export const BAND_MID_CEILING = 66.7;

function bandFor(score: number): ProxyBand {
  if (score <= BAND_LOW_CEILING) return 'low';
  if (score <= BAND_MID_CEILING) return 'mid';
  return 'high';
}

/** Round to one decimal so a reading serialises and compares cleanly. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function scoreFor(kind: ProxyKind, statistics: ImageStatistics): ProxyScore {
  const ramp = PROXY_RAMPS[kind];
  const rawValue = statistics[ramp.derivedFrom];
  const span = ramp.at100 - ramp.at0;
  const position = span === 0 ? 0 : (rawValue - ramp.at0) / span;
  const score = round1(Math.min(100, Math.max(0, position * 100)));

  return {
    proxyOf: kind,
    score,
    band: bandFor(score),
    derivedFrom: ramp.derivedFrom,
    rawValue,
    calibration: 'uncalibrated-heuristic',
    isDiagnostic: false,
  };
}

/** Derive all four proxies. Pure; see the warning on `PROXY_RAMPS`. */
export function deriveProxies(statistics: ImageStatistics): ProxySet {
  return {
    brightnessProxy: scoreFor('brightness', statistics),
    evennessProxy: scoreFor('evenness', statistics),
    rednessProxy: scoreFor('redness', statistics),
    textureProminenceProxy: scoreFor('textureProminence', statistics),
  };
}

/* ========================================================================== */
/* 6. Capture quality                                                         */
/* ========================================================================== */

/**
 * [E] Every threshold below is a proposal, chosen to be generous — they are
 *     meant to catch frames that are obviously unusable, not to police
 *     photography. They are the one group of constants in this file worth
 *     tuning early, because they can be validated by taking twenty photographs
 *     and checking which ones get rejected. That requires no clinical data,
 *     only a phone.
 */
export const QUALITY_THRESHOLDS = {
  /** [E] Below this mean luma, shadow noise dominates every other statistic. */
  tooDarkBelow: 0.12,
  /** [E] Above this, most of the frame is on the shoulder of the response curve. */
  tooBrightAbove: 0.88,
  /** [E] More than a tenth of the frame with no highlight detail left. */
  clippedHighAbove: 0.1,
  /** [E] More than a tenth of the frame crushed to black. */
  clippedLowAbove: 0.1,
  /** [E] Below this local contrast the frame is defocused, or is a blank wall. */
  lowDetailBelow: 0.002,
  /**
   * [E] Channel means this far apart mean coloured light or a badly broken
   *     white balance.
   *
   *     Deliberately loose, and the reason matters. Skin is red-dominant by
   *     nature, so a face filling the frame drives this statistic up all by
   *     itself — `channelSpread` cannot separate a warm lamp from a warm
   *     subject, and no statistic computed without a reference white can.
   *     Checking a spread of plausible sRGB skin values (light through deep)
   *     puts an ordinary, correctly-lit face somewhere around 0.12-0.26 on
   *     this scale, so a threshold inside that band would reject most valid
   *     captures. An earlier draft used 0.18 and did exactly that.
   *
   *     0.42 sits well clear of it: only an extreme cast — coloured light, a
   *     heavy filter, a white balance that has given up — trips it. The cost
   *     is that a moderate cast passes unflagged and quietly moves
   *     `rednessSeparation`. That is a known, unfixable-from-here limitation,
   *     not an oversight; it is why redness is a proxy and not a finding.
   */
  colourCastAbove: 0.42,
} as const;

/**
 * Decide whether a frame was worth measuring.
 *
 * Called before the numbers are shown, not after. Statistics from a bad frame
 * are still well-formed — that is precisely the danger.
 */
export function assessCaptureQuality(
  statistics: ImageStatistics
): CaptureQuality {
  const flags: CaptureQualityFlag[] = [];

  if (statistics.meanLuminance < QUALITY_THRESHOLDS.tooDarkBelow) {
    flags.push('too-dark');
  }
  if (statistics.meanLuminance > QUALITY_THRESHOLDS.tooBrightAbove) {
    flags.push('too-bright');
  }
  if (statistics.clippedHighFraction > QUALITY_THRESHOLDS.clippedHighAbove) {
    flags.push('clipped-highlights');
  }
  if (statistics.clippedLowFraction > QUALITY_THRESHOLDS.clippedLowAbove) {
    flags.push('crushed-shadows');
  }
  if (statistics.localContrast < QUALITY_THRESHOLDS.lowDetailBelow) {
    flags.push('low-detail');
  }
  if (statistics.channelSpread > QUALITY_THRESHOLDS.colourCastAbove) {
    flags.push('strong-colour-cast');
  }

  return { usable: flags.length === 0, flags };
}

/* ========================================================================== */
/* 7. Assembly                                                                */
/* ========================================================================== */

/**
 * The whole pipeline, minus the camera: bytes in, reading out.
 *
 * This is the function to unit-test. It needs no device, no permissions and no
 * mocking — build a `Uint8ClampedArray`, call it, and check the arithmetic.
 * {@link SkinAnalyzer} implementations are thin wrappers that obtain the
 * buffer and then call this.
 *
 * `capturedAt` is a required argument rather than a `Date.now()` call so that
 * the function stays deterministic.
 */
export function analyzeRgba(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  meta: {
    readonly analyzerId: string;
    readonly analyzerVersion: string;
    readonly capturedAt: number;
  }
): HeuristicSkinReading {
  const statistics = computeImageStatistics(rgba, width, height);

  return {
    confidence: 'heuristic',
    analyzerId: meta.analyzerId,
    analyzerVersion: meta.analyzerVersion,
    capturedAt: meta.capturedAt,
    statistics,
    proxies: deriveProxies(statistics),
    captureQuality: assessCaptureQuality(statistics),
    disclaimer: HEURISTIC_DISCLAIMER,
  };
}
