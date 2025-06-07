import Jimp from "jimp";
import * as fs from "fs";
import * as pako from "pako";

export interface CatImageHeader {
  magic: string;
  version: number;
  width: number;
  height: number;
  compression: number;
  timestamp: number;
  checksum: number;
}

export interface CatImageInfo {
  width: number;
  height: number;
  fileSize: number;
  compressionRatio: number;
  created: string;
}

export class CatImageConverter {
  private static readonly MAGIC = "CAT1";
  private static readonly VERSION = 1;
  private static readonly HEADER_SIZE = 32;

  private encodeHeader(header: CatImageHeader): Buffer {
    const buffer = Buffer.alloc(CatImageConverter.HEADER_SIZE);
    let offset = 0;

    buffer.write(header.magic, offset, 4);
    offset += 4;
    buffer.writeUInt32LE(header.version, offset);
    offset += 4;
    buffer.writeUInt32LE(header.width, offset);
    offset += 4;
    buffer.writeUInt32LE(header.height, offset);
    offset += 4;
    buffer.writeUInt32LE(header.compression, offset);
    offset += 4;
    buffer.writeUInt32LE(header.timestamp, offset);
    offset += 4;
    buffer.writeUInt32LE(header.checksum, offset);
    offset += 4;

    return buffer;
  }

  private decodeHeader(buffer: Buffer): CatImageHeader {
    let offset = 0;

    const magic = buffer.toString("ascii", offset, offset + 4);
    offset += 4;
    const version = buffer.readUInt32LE(offset);
    offset += 4;
    const width = buffer.readUInt32LE(offset);
    offset += 4;
    const height = buffer.readUInt32LE(offset);
    offset += 4;
    const compression = buffer.readUInt32LE(offset);
    offset += 4;
    const timestamp = buffer.readUInt32LE(offset);
    offset += 4;
    const checksum = buffer.readUInt32LE(offset);
    offset += 4;

    return { magic, version, width, height, compression, timestamp, checksum };
  }

  private compressImageData(data: Buffer): Buffer {
    const compressed = pako.deflate(data, { level: 9 });
    return Buffer.from(compressed);
  }

  private decompressImageData(data: Buffer): Buffer {
    const decompressed = pako.inflate(data);
    return Buffer.from(decompressed);
  }

  private calculateChecksum(data: Buffer): number {
    let checksum = 0;
    for (let i = 0; i < data.length; i++) {
      checksum = (checksum + data[i]) & 0xffffffff;
    }
    return checksum;
  }

  private optimizeImageData(imageData: Buffer): Buffer {
    const optimized = Buffer.alloc(imageData.length);
    let writeIndex = 0;

    for (let i = 0; i < imageData.length; i += 4) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      const a = imageData[i + 3];

      if (a === 0) {
        optimized[writeIndex++] = 0;
        optimized[writeIndex++] = 0;
        optimized[writeIndex++] = 0;
        optimized[writeIndex++] = 0;
      } else {
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

        if (
          Math.abs(r - gray) < 5 &&
          Math.abs(g - gray) < 5 &&
          Math.abs(b - gray) < 5
        ) {
          optimized[writeIndex++] = gray;
          optimized[writeIndex++] = gray;
          optimized[writeIndex++] = gray;
          optimized[writeIndex++] = a;
        } else {
          optimized[writeIndex++] = r;
          optimized[writeIndex++] = g;
          optimized[writeIndex++] = b;
          optimized[writeIndex++] = a;
        }
      }
    }

    return optimized.slice(0, writeIndex);
  }

  async pngToCat(inputPath: string, outputPath: string): Promise<void> {
    const image = await Jimp.read(inputPath);
    const width = image.getWidth();
    const height = image.getHeight();

    const rawData = Buffer.from(image.bitmap.data);
    const optimizedData = this.optimizeImageData(rawData);
    const compressedData = this.compressImageData(optimizedData);

    const header: CatImageHeader = {
      magic: CatImageConverter.MAGIC,
      version: CatImageConverter.VERSION,
      width,
      height,
      compression: 1,
      timestamp: Math.floor(Date.now() / 1000),
      checksum: this.calculateChecksum(compressedData),
    };

    const headerBuffer = this.encodeHeader(header);
    const catFile = Buffer.concat([headerBuffer, compressedData]);

    fs.writeFileSync(outputPath, catFile);
  }

  async catToPng(inputPath: string, outputPath: string): Promise<void> {
    const catData = fs.readFileSync(inputPath);

    if (catData.length < CatImageConverter.HEADER_SIZE) {
      throw new Error("Неверный формат CAT файла");
    }

    const headerBuffer = catData.slice(0, CatImageConverter.HEADER_SIZE);
    const imageDataBuffer = catData.slice(CatImageConverter.HEADER_SIZE);

    const header = this.decodeHeader(headerBuffer);

    if (header.magic !== CatImageConverter.MAGIC) {
      throw new Error("Неверная сигнатура CAT файла");
    }

    if (header.version !== CatImageConverter.VERSION) {
      throw new Error(`Неподдерживаемая версия CAT файла: ${header.version}`);
    }

    const calculatedChecksum = this.calculateChecksum(imageDataBuffer);
    if (calculatedChecksum !== header.checksum) {
      throw new Error("Ошибка целостности файла");
    }

    const decompressedData = this.decompressImageData(imageDataBuffer);

    const image = new Jimp(header.width, header.height);

    for (let i = 0; i < decompressedData.length; i += 4) {
      const pixelIndex = i / 4;
      const x = pixelIndex % header.width;
      const y = Math.floor(pixelIndex / header.width);

      if (y < header.height) {
        const r = decompressedData[i];
        const g = decompressedData[i + 1];
        const b = decompressedData[i + 2];
        const a = decompressedData[i + 3];

        const color = Jimp.rgbaToInt(r, g, b, a);
        image.setPixelColor(color, x, y);
      }
    }

    await image.writeAsync(outputPath);
  }

  async getCatImageInfo(inputPath: string): Promise<CatImageInfo> {
    const catData = fs.readFileSync(inputPath);
    const stats = fs.statSync(inputPath);

    if (catData.length < CatImageConverter.HEADER_SIZE) {
      throw new Error("Неверный формат CAT файла");
    }

    const headerBuffer = catData.slice(0, CatImageConverter.HEADER_SIZE);
    const header = this.decodeHeader(headerBuffer);

    if (header.magic !== CatImageConverter.MAGIC) {
      throw new Error("Неверная сигнатура CAT файла");
    }

    const uncompressedSize = header.width * header.height * 4;
    const compressionRatio =
      ((stats.size - CatImageConverter.HEADER_SIZE) / uncompressedSize) * 100;

    return {
      width: header.width,
      height: header.height,
      fileSize: stats.size,
      compressionRatio,
      created: new Date(header.timestamp * 1000).toLocaleString(),
    };
  }
}
