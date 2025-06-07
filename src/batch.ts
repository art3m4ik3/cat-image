import { CatImageConverter } from "./converter";
import * as fs from "fs";
import * as path from "path";

export class BatchConverter {
  private converter: CatImageConverter;

  constructor() {
    this.converter = new CatImageConverter();
  }

  async convertDirectory(
    inputDir: string,
    outputDir: string,
    format: "cat" | "png",
  ): Promise<void> {
    if (!fs.existsSync(inputDir)) {
      throw new Error(`Директория не найдена: ${inputDir}`);
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const files = fs.readdirSync(inputDir);
    const targetExt = format === "cat" ? ".png" : ".cat";
    const outputExt = format === "cat" ? ".cat" : ".png";

    const targetFiles = files.filter(
      (file) => path.extname(file).toLowerCase() === targetExt,
    );

    if (targetFiles.length === 0) {
      console.log(
        `Не найдено файлов с расширением ${targetExt} в директории ${inputDir}`,
      );
      return;
    }

    console.log(`Найдено ${targetFiles.length} файлов для конвертации...`);

    let converted = 0;
    let failed = 0;

    for (const file of targetFiles) {
      try {
        const inputPath = path.join(inputDir, file);
        const outputFileName = path.basename(file, targetExt) + outputExt;
        const outputPath = path.join(outputDir, outputFileName);

        if (format === "cat") {
          await this.converter.pngToCat(inputPath, outputPath);
        } else {
          await this.converter.catToPng(inputPath, outputPath);
        }

        console.log(`✓ ${file} → ${outputFileName}`);
        converted++;
      } catch (error: any) {
        console.error(`✗ Ошибка при конвертации ${file}: ${error.message}`);
        failed++;
      }
    }

    console.log(`\nГотово! Конвертировано: ${converted}, Ошибок: ${failed}`);
  }

  async compareCompression(inputDir: string): Promise<void> {
    if (!fs.existsSync(inputDir)) {
      throw new Error(`Директория не найдена: ${inputDir}`);
    }

    const files = fs
      .readdirSync(inputDir)
      .filter((file) => path.extname(file).toLowerCase() === ".png");

    if (files.length === 0) {
      console.log("Не найдено PNG файлов для анализа");
      return;
    }

    console.log("=== Анализ сжатия ===\n");

    let totalOriginal = 0;
    let totalCompressed = 0;

    for (const file of files) {
      try {
        const inputPath = path.join(inputDir, file);
        const tempCatPath = path.join(inputDir, `temp_${file}.cat`);

        await this.converter.pngToCat(inputPath, tempCatPath);

        const originalSize = fs.statSync(inputPath).size;
        const compressedSize = fs.statSync(tempCatPath).size;
        const ratio = (compressedSize / originalSize) * 100;

        console.log(`${file}:`);
        console.log(`  PNG: ${originalSize} байт`);
        console.log(`  CAT: ${compressedSize} байт`);
        console.log(`  Сжатие: ${ratio.toFixed(1)}%`);
        console.log(`  Экономия: ${originalSize - compressedSize} байт\n`);

        totalOriginal += originalSize;
        totalCompressed += compressedSize;

        fs.unlinkSync(tempCatPath);
      } catch (error: any) {
        console.error(`Ошибка при анализе ${file}: ${error.message}\n`);
      }
    }

    const overallRatio = (totalCompressed / totalOriginal) * 100;
    console.log("=== Итого ===");
    console.log(`Исходный размер: ${totalOriginal} байт`);
    console.log(`Размер CAT: ${totalCompressed} байт`);
    console.log(`Общее сжатие: ${overallRatio.toFixed(1)}%`);
    console.log(`Общая экономия: ${totalOriginal - totalCompressed} байт`);
  }
}
