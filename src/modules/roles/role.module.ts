import { Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { Role } from './entities/role.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '@modules/users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Role]), UsersModule],
  controllers: [RoleController],
  providers: [RoleService],
})
export class RoleModule {}
