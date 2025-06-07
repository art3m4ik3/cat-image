import { Command } from "commander";
import { CatImageConverter } from "./converter";
import { CatImageViewer } from "./viewer";
import { BatchConverter } from "./batch";
import * as fs from "fs";
import * as path from "path";

const program = new Command();

program
  .name("catimg")
  .description("Конвертер и просмотрщик для формата изображений .cat")
  .version("1.0.0");

program
  .command("convert")
  .description("Конвертировать изображение между форматами PNG и CAT")
  .requiredOption("-i, --input <file>", "Входной файл")
  .requiredOption("-o, --output <file>", "Выходной файл")
  .action(async (options: any) => {
    try {
      const converter = new CatImageConverter();
      const inputExt = path.extname(options.input).toLowerCase();
      const outputExt = path.extname(options.output).toLowerCase();

      if (!fs.existsSync(options.input)) {
        console.error(`Ошибка: Файл ${options.input} не найден`);
        process.exit(1);
      }

      if (inputExt === ".png" && outputExt === ".cat") {
        await converter.pngToCat(options.input, options.output);
        console.log(`✓ Конвертирован PNG → CAT: ${options.output}`);
      } else if (inputExt === ".cat" && outputExt === ".png") {
        await converter.catToPng(options.input, options.output);
        console.log(`✓ Конвертирован CAT → PNG: ${options.output}`);
      } else {
        console.error("Ошибка: Поддерживаются только конвертации PNG ↔ CAT");
        process.exit(1);
      }
    } catch (error: any) {
      console.error(`Ошибка конвертации: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command("view")
  .description("Просмотреть изображение в формате CAT")
  .requiredOption("-f, --file <file>", "CAT файл для просмотра")
  .option("-s, --scale <number>", "Масштаб отображения (по умолчанию 1)", "1")
  .action(async (options: any) => {
    try {
      const viewer = new CatImageViewer();

      if (!fs.existsSync(options.file)) {
        console.error(`Ошибка: Файл ${options.file} не найден`);
        process.exit(1);
      }

      if (path.extname(options.file).toLowerCase() !== ".cat") {
        console.error("Ошибка: Можно просматривать только .cat файлы");
        process.exit(1);
      }

      await viewer.displayCatImage(options.file, parseFloat(options.scale));
    } catch (error: any) {
      console.error(`Ошибка просмотра: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command("info")
  .description("Показать информацию о CAT файле")
  .requiredOption("-f, --file <file>", "CAT файл для анализа")
  .action(async (options: any) => {
    try {
      const converter = new CatImageConverter();

      if (!fs.existsSync(options.file)) {
        console.error(`Ошибка: Файл ${options.file} не найден`);
        process.exit(1);
      }

      const info = await converter.getCatImageInfo(options.file);
      console.log("=== Информация о CAT изображении ===");
      console.log(`Ширина: ${info.width}px`);
      console.log(`Высота: ${info.height}px`);
      console.log(`Размер файла: ${info.fileSize} байт`);
      console.log(`Степень сжатия: ${info.compressionRatio.toFixed(2)}%`);
      console.log(`Создан: ${info.created}`);
    } catch (error: any) {
      console.error(`Ошибка получения информации: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command("batch")
  .description("Массовая конвертация файлов в директории")
  .requiredOption("-i, --input <dir>", "Входная директория")
  .requiredOption("-o, --output <dir>", "Выходная директория")
  .requiredOption("-f, --format <format>", "Целевой формат (cat или png)")
  .action(async (options: any) => {
    try {
      const batch = new BatchConverter();

      if (options.format !== "cat" && options.format !== "png") {
        console.error('Ошибка: Формат должен быть "cat" или "png"');
        process.exit(1);
      }

      await batch.convertDirectory(
        options.input,
        options.output,
        options.format,
      );
    } catch (error: any) {
      console.error(`Ошибка массовой конвертации: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command("analyze")
  .description("Анализ эффективности сжатия")
  .requiredOption("-d, --dir <dir>", "Директория с PNG файлами")
  .action(async (options: any) => {
    try {
      const batch = new BatchConverter();
      await batch.compareCompression(options.dir);
    } catch (error: any) {
      console.error(`Ошибка анализа: ${error.message}`);
      process.exit(1);
    }
  });

if (process.argv.length <= 2) {
  program.help();
}

program.parse();
