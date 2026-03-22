import { DocumentBuilder, OpenAPIObject } from '@nestjs/swagger';

export const swaggerConfig: Omit<OpenAPIObject, 'paths'> = new DocumentBuilder()
  .setTitle('QuickCart API')
  .setDescription('E-commerce Backend API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();
