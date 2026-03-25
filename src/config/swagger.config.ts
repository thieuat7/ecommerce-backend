import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('QuickCart API')
  .setDescription('E-commerce Backend API')
  .setVersion('1.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Nhập Access Token vào đây',
      in: 'header',
    },
    'access-token',
  )
  .build();
