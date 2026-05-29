// infrastructure/adapters/minio-storage.adapter.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { IStoragePort } from '../../core/ports/storage.port';
import { IFileDto } from '../../core/dtos/file.dto';

@Injectable()
export class MinioStorageAdapter implements IStoragePort, OnModuleInit {
  private client: Client;
  private readonly logger = new Logger(MinioStorageAdapter.name);

  // Inject ConfigService để quản lý biến môi trường an toàn
  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.client = new Client({
      endPoint: this.configService.getOrThrow<string>('MINIO_ENDPOINT'),
      port: Number(this.configService.getOrThrow<number>('MINIO_PORT')),
      useSSL: this.configService.getOrThrow<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.getOrThrow<string>('MINIO_ACCESS_KEY'),
      secretKey: this.configService.getOrThrow<string>('MINIO_SECRET_KEY'),
    });
    this.logger.log(
      'MinIO Client initialized successfully with environment variables.',
    );
  }

  async uploadFile(file: IFileDto, bucketName: string): Promise<string> {
    await this.ensureBucketExists(bucketName);

    const fileName = `${Date.now()}-${file.originalname}`;

    await this.client.putObject(bucketName, fileName, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });

    return this.getFileUrl(fileName, bucketName);
  }

  async deleteFile(fileName: string, bucketName: string): Promise<void> {
    await this.client.removeObject(bucketName, fileName);
  }

  // --- Các hàm private hỗ trợ ---

  private async ensureBucketExists(bucketName: string) {
    const exists = await this.client.bucketExists(bucketName);
    if (!exists) {
      await this.client.makeBucket(bucketName, 'us-east-1');
      // Set public policy như cũ
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      };
      await this.client.setBucketPolicy(bucketName, JSON.stringify(policy));
      this.logger.log(`Created bucket: ${bucketName} with public policy`);
    }
  }

  private getFileUrl(fileName: string, bucketName: string): string {
    const endPoint = this.configService.get<string>(
      'MINIO_ENDPOINT',
      'localhost',
    );
    const port = this.configService.get<number>('MINIO_PORT', 9000);
    return `http://${endPoint}:${port}/${bucketName}/${fileName}`;
  }
}
