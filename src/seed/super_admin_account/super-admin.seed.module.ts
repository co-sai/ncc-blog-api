import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SuperAdminSeedingService } from './super-admin.seed.service';
import { Admin, AdminSchema } from 'src/admin/schema/admin.schema';
import { Role, RoleSchema } from 'src/admin/schema/role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Admin.name, schema: AdminSchema }]),
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }]),
  ],
  providers: [SuperAdminSeedingService],
})
export class SuperAdminSeedingModule {}
