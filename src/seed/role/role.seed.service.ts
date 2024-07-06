import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from 'src/admin/schema/role.schema';

@Injectable()
export class RoleSeederService implements OnModuleInit {
  constructor(@InjectModel(Role.name) private readonly roleModel: Model<Role>) {}

  async onModuleInit() {
    await this.seedRoles();
  }

  private async seedRoles() {
    const roles = ['ADMIN', 'SUPER_ADMIN', 'USER'];
    for (const role of roles) {
      const exists = await this.roleModel.exists({ name: role });
      if (!exists) {
        await new this.roleModel({ name: role }).save();
      }
    }
    console.log('Seed role data inserted');
  }
}
