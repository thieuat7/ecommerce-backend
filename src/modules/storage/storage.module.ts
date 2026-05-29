import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { I_STORAGE_PORT } from './core/ports/storage.port';
import { MinioStorageAdapter } from './infrastructure/adapters/minio-storage.adapter';

@Global()
@Module({
  // 1. Phải import ConfigModule vì MinioStorageAdapter cần dùng ConfigService
  imports: [ConfigModule],

  providers: [
    {
      // 2. Khai báo Token:
      provide: I_STORAGE_PORT,
      useClass: MinioStorageAdapter,
    },
  ],

  // 3. Exports Token thay vì Class.
  exports: [I_STORAGE_PORT],
})
export class StorageModule {}
