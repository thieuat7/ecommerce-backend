// core/dtos/file.dto.ts
export interface IFileDto {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}
