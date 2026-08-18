import { Controller, Get, Header, NotFoundException, Param, StreamableFile } from '@nestjs/common';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { basename } from 'path';
import { Public } from '../common/auth/decorators';

export const UPLOADS_DIR =
  process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

@Controller('uploads')
export class UploadsController {
  @Get(':file')
  @Public()
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  serve(@Param('file') file: string): StreamableFile {
    const name = basename(file);
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    const mime = MIME_BY_EXT[ext];
    if (!mime || !/^[0-9a-f-]{36}\.(jpg|jpeg|png)$/i.test(name)) {
      throw new NotFoundException('Arquivo não encontrado');
    }
    const path = join(UPLOADS_DIR, name);
    if (!existsSync(path)) throw new NotFoundException('Arquivo não encontrado');
    return new StreamableFile(createReadStream(path), {
      type: mime,
      disposition: 'inline',
    });
  }
}