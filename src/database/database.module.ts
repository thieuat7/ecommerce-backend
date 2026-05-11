import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<TypeOrmModuleOptions>('database');
        console.log('Database configuration loaded:', config);

        if (!config) {
          throw new Error(
            'Không thể tải cấu hình Database. Vui lòng kiểm tra lại file .env hoặc database.config.ts',
          );
        }

        return {
          ...config,
          synchronize: false,
          // Tự động tìm và nạp các file có đuôi .entity.ts
          autoLoadEntities: true,
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
