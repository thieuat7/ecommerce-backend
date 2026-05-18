import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttributeService } from './attribute.service';
import { AttributeController } from './attribute.controller';
import { Attribute } from './entities/attribute.entity';
import { AttributeValue } from './entities/attribute-value.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Attribute, AttributeValue])],
  controllers: [AttributeController],
  providers: [AttributeService],
  exports: [AttributeService, TypeOrmModule],
})
export class AttributeModule {}
