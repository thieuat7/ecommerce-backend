// core/ports/storage.port.ts
import { IFileDto } from '../dtos/file.dto';

export const I_STORAGE_PORT = 'I_STORAGE_PORT';

export interface IStoragePort {
  uploadFile(file: IFileDto, bucketName: string): Promise<string>;
  deleteFile(fileName: string, bucketName: string): Promise<void>;
}
