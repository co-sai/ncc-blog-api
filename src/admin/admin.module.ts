import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminAuthController } from './controllers/admin.auth.controller';
import { AdminService } from './admin.service';
import { AuthModule } from 'src/auth/auth.module';
import { MailModule } from 'src/mail/mail.module';
import { CommonModule } from 'src/common/common.module';

import { Admin, AdminSchema } from './schema/admin.schema';
import { Role, RoleSchema } from './schema/role.schema';
import { MulterModule } from '@nestjs/platform-express';
import { multerConfig } from './admin.multer.config';
import { AdminController } from './controllers/admin.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Admin.name, schema: AdminSchema },
      { name: Role.name, schema: RoleSchema }
    ]),
    MulterModule.register(multerConfig),
    AuthModule,
    MailModule,
    CommonModule
  ],
  controllers: [AdminAuthController, AdminController],
  providers: [AdminService],
  exports : [AdminService]
})
export class AdminModule { }
