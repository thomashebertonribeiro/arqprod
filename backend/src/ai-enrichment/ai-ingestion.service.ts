import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class AiIngestionService {
  private readonly uploadDir = process.env.AI_UPLOAD_DIR || '/tmp/ai_uploads';

  constructor() {
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (e) {
      // ignore
    }
  }

  async saveUploadedFile(buffer: Buffer, originalName: string, mimeType: string): Promise<{ storagePath: string; filename: string }> {
    const ext = path.extname(originalName) || this.getExtensionFromMime(mimeType);
    const hash = crypto.randomBytes(16).toString('hex');
    const filename = `${hash}${ext}`;
    const storagePath = path.join(this.uploadDir, filename);
    await fs.writeFile(storagePath, buffer);
    return { storagePath, filename };
  }

  private getExtensionFromMime(mimeType: string): string {
    const map: Record<string, string> = {
      'application/pdf': '.pdf',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'text/csv': '.csv',
      'application/vnd.ms-excel': '.csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    };
    return map[mimeType] || '.bin';
  }

  async extractFromPDF(filePath: string): Promise<string> {
    try {
      const { PDFParse } = await import('pdf-parse');
      const dataBuffer = await fs.readFile(filePath);
      const parser = new PDFParse({ data: dataBuffer });
      const result = await parser.getText();
      return result.text;
    } catch (error) {
      throw new Error(`Falha ao extrair texto do PDF: ${error.message}`);
    }
  }

  async extractFromImage(filePath: string): Promise<string> {
    // Para imagens, retorna marker para o orchestrator processar via modelo vision
    return `IMAGE:${filePath}`;
  }

  async extractFromCSV(filePath: string): Promise<string> {
    try {
      const { parse } = await import('csv-parse/sync');
      const content = await fs.readFile(filePath, 'utf-8');
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
      return JSON.stringify(records, null, 2);
    } catch (error) {
      throw new Error(`Falha ao parsear CSV: ${error.message}`);
    }
  }

  async extractFromXLSX(filePath: string): Promise<string> {
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.readFile(filePath);
      const sheets: Record<string, any[]> = {};
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        sheets[sheetName] = XLSX.utils.sheet_to_json(sheet);
      }
      return JSON.stringify(sheets, null, 2);
    } catch (error) {
      throw new Error(`Falha ao parsear XLSX: ${error.message}`);
    }
  }

  async extractFromURL(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ArqprodAI/1.0)',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') ?? '';
      const html = await response.text();

      // Se for PDF, baixar e processar
      if (contentType.includes('application/pdf') || url.endsWith('.pdf')) {
        const tempPath = `/tmp/ai_download_${Date.now()}.pdf`;
        await this.downloadFile(url, tempPath);
        const text = await this.extractFromPDF(tempPath);
        await fs.unlink(tempPath).catch(() => {});
        return text;
      }

      // Se for imagem
      if (contentType.startsWith('image/')) {
        return `IMAGE:${url}`;
      }

      // Extrair texto do HTML
      return this.extractTextFromHTML(html);
    } catch (error) {
      throw new Error(`Falha ao buscar URL: ${error.message}`);
    }
  }

  private extractTextFromHTML(html: string): string {
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.substring(0, 50000);
  }

  async downloadFile(url: string, destinationPath: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Falha ao baixar: ${response.statusText}`);
    const buffer = await response.arrayBuffer();
    await fs.writeFile(destinationPath, Buffer.from(buffer));
  }

  // Processar arquivo baseado no tipo MIME
  async processFile(
    filePath: string,
    mimeType: string,
    originalName: string
  ): Promise<{ type: string; extractedText: string; metadata: Record<string, unknown> }> {
    let type: string;
    let extractedText: string;
    const metadata: Record<string, unknown> = { originalName };

    if (mimeType === 'application/pdf' || filePath.endsWith('.pdf')) {
      type = 'pdf';
      extractedText = await this.extractFromPDF(filePath);
      metadata.pages = extractedText.split('\n\n').length; // estimativa
    } else if (filePath.endsWith('.csv') || mimeType === 'text/csv') {
      type = 'csv';
      extractedText = await this.extractFromCSV(filePath);
    } else if (filePath.endsWith('.xlsx') || mimeType.includes('spreadsheetml')) {
      type = 'xlsx';
      extractedText = await this.extractFromXLSX(filePath);
    } else if (mimeType.startsWith('image/')) {
      type = 'image';
      extractedText = `IMAGE:${filePath}`;
    } else if (mimeType === 'text/plain' || filePath.endsWith('.txt')) {
      type = 'text';
      extractedText = await fs.readFile(filePath, 'utf-8');
    } else {
      type = 'unknown';
      extractedText = `Tipo não suportado: ${mimeType}`;
    }

    return { type, extractedText, metadata };
  }

  // Processar múltiplos arquivos
  async processFiles(
    files: Array<{ buffer: Buffer; originalName: string; mimeType: string }>
  ): Promise<Array<{ type: string; extractedText: string; metadata: Record<string, unknown>; storagePath: string }>> {
    const results: Array<{ type: string; extractedText: string; metadata: Record<string, unknown>; storagePath: string }> = [];
    for (const file of files) {
      const { storagePath } = await this.saveUploadedFile(file.buffer, file.originalName, file.mimeType);
      const { type, extractedText, metadata } = await this.processFile(storagePath, file.mimeType, file.originalName);
      results.push({ type, extractedText, metadata: { ...metadata, originalPath: storagePath }, storagePath });
    }
    return results;
  }
}