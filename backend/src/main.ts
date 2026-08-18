import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { UPLOADS_DIR } from './uploads/uploads.controller';

async function bootstrap() {
  mkdirSync(UPLOADS_DIR, { recursive: true });
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: true,
    credentials: false,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Arqprod API')
    .setDescription(
      'Plataforma de gestão de produtos (PIM) multi-tenant com campos customizados por categoria ' +
        'sem migração de banco. Autenticação: header `Authorization: Bearer {api_key}` (chaves `akp_...`) ' +
        'ou Bearer JWT (painel admin). Documentação interativa em /api/docs.',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT ou API key (akp_...)',
        description: 'Cole aqui sua API key (akp_...) ou o JWT do painel',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tryItOutEnabled: true,
    },
  });

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Arqprod API rodando em http://0.0.0.0:${port}`);
  console.log(`Swagger: http://localhost:${port}/api/docs`);
}
bootstrap();