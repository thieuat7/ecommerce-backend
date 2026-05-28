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
      // 2. Khai báo Token: Khi có ai gọi I_STORAGE_PORT...
      provide: I_STORAGE_PORT,

      // ...thì hãy giao cho họ một instance của MinioStorageAdapter
      useClass: MinioStorageAdapter,
    },
  ],

  // 3. XUẤT KHẨU (Export) Token thay vì Class.
  // Các module khác sẽ chỉ biết đến Interface, hoàn toàn mù mịt về Adapter.
  exports: [I_STORAGE_PORT],
})
export class StorageModule {} // 4. Đổi tên thành StorageModule
