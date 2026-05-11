import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    console.log('AppService xin chào');
    return 'Hello ss World!';
  }
}
