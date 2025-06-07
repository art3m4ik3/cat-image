import { CatImageConverter } from "./converter";
import Jimp from "jimp";
import * as fs from "fs";

export class CatImageViewer {
  private readonly converter: CatImageConverter;

  constructor() {
    this.converter = new CatImageConverter();
  }

  async displayCatImage(catPath: string, scale: number = 1): Promise<void> {
    try {
      const tempPngPath = `${catPath}.temp.png`;

      await this.converter.catToPng(catPath, tempPngPath);

      const image = await Jimp.read(tempPngPath);

      if (scale !== 1) {
        image.scale(scale);
      }

      const width = image.getWidth();
      const height = image.getHeight();

      console.log(`\n=== Просмотр CAT изображения ===`);
      console.log(`Размер: ${width}x${height} (масштаб: ${scale}x)`);
      console.log(`Файл: ${catPath}\n`);

      this.renderImageAsAscii(image);

      fs.unlinkSync(tempPngPath);
    } catch (error: any) {
      throw new Error(`Ошибка отображения изображения: ${error.message}`);
    }
  }

  private renderImageAsAscii(image: Jimp): void {
    const width = image.getWidth();
    const height = image.getHeight();

    const chars = ["█", "▉", "▊", "▋", "▌", "▍", "▎", "▏", " "];
    const maxDisplayWidth = 120;
    const maxDisplayHeight = 40;

    let displayWidth = width;
    let displayHeight = height;

    if (width > maxDisplayWidth) {
      const ratio = maxDisplayWidth / width;
      displayWidth = maxDisplayWidth;
      displayHeight = Math.floor(height * ratio);
    }

    if (displayHeight > maxDisplayHeight) {
      const ratio = maxDisplayHeight / displayHeight;
      displayHeight = maxDisplayHeight;
      displayWidth = Math.floor(displayWidth * ratio);
    }

    const resized = image.clone().resize(displayWidth, displayHeight);

    for (let y = 0; y < displayHeight; y += 2) {
      let line = "";

      for (let x = 0; x < displayWidth; x++) {
        const topPixel = Jimp.intToRGBA(resized.getPixelColor(x, y));
        const bottomPixel =
          y + 1 < displayHeight
            ? Jimp.intToRGBA(resized.getPixelColor(x, y + 1))
            : { r: 0, g: 0, b: 0, a: 0 };

        const topBrightness = this.getBrightness(topPixel);
        const bottomBrightness = this.getBrightness(bottomPixel);

        const avgBrightness = (topBrightness + bottomBrightness) / 2;
        const charIndex = Math.floor(
          (avgBrightness / 255) * (chars.length - 1),
        );

        line += chars[chars.length - 1 - charIndex];
      }

      console.log(line);
    }

    console.log();
  }

  private getBrightness(pixel: {
    r: number;
    g: number;
    b: number;
    a: number;
  }): number {
    if (pixel.a === 0) return 0;
    return Math.round(0.299 * pixel.r + 0.587 * pixel.g + 0.114 * pixel.b);
  }

  async previewCatImage(catPath: string): Promise<void> {
    try {
      const info = await this.converter.getCatImageInfo(catPath);

      console.log(`\n=== Предпросмотр CAT изображения ===`);
      console.log(`Файл: ${catPath}`);
      console.log(`Размер: ${info.width}x${info.height}`);
      console.log(`Размер файла: ${info.fileSize} байт`);
      console.log(`Сжатие: ${info.compressionRatio.toFixed(1)}%`);
      console.log(`Создан: ${info.created}`);
      console.log(`=====================================\n`);

      await this.displayCatImage(catPath, 0.5);
    } catch (error: any) {
      throw new Error(`Ошибка предпросмотра: ${error.message}`);
    }
  }
}
