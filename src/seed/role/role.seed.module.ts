import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Role, RoleSchema } from 'src/admin/schema/role.schema';
import { RoleSeederService } from './role.seed.service';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }]),
    // Import your MongooseModule.forRoot(...) here if necessary
  ],
  providers: [RoleSeederService],
})
export class RoleSeedModule {}
