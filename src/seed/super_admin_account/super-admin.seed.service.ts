import * as mongoose from 'mongoose';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';
import { ConfigService } from '@nestjs/config';
import { Admin, AdminRole } from 'src/admin/schema/admin.schema';
import { Role } from 'src/admin/schema/role.schema';

const scrypt = promisify(_scrypt);

@Injectable()
export class SuperAdminSeedingService implements OnModuleInit {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<Admin>,
    @InjectModel(Role.name) private roleModel: Model<Role>,
    private readonly configService: ConfigService
  ) { }

  async onModuleInit() {
    await this.seedAdmin();
  }

  async seedAdmin() {
    const adminExists = await this.adminModel.findOne({ role_id: await this.getSuperAdminRoleId() }).exec();

    if (!adminExists) {
      const hashedPassword = await this.hashPassword(this.configService.get<string>('PASSWORD'));
      const superAdminRoleId = await this.getSuperAdminRoleId();

      const admin = new this.adminModel({
        first_name: this.configService.get<string>('FIRST_NAME'),
        last_name: this.configService.get<string>('LAST_NAME'),
        email: this.configService.get<string>('EMAIL'),
        country_code: this.configService.get<string>('COUNTRY_CODE'),
        phone_number: this.configService.get<string>('PHONE_NUMBER'),
        role_id: superAdminRoleId,
        password: hashedPassword,
      });

      await admin.save();
      console.log('SUPER_ADMIN user created');
    } else {
      console.log('SUPER_ADMIN user already exists');
    }
  }

  private async getSuperAdminRoleId() {
    const superAdminRole = await this.roleModel.findOne({ name: AdminRole.SUPER_ADMIN }).exec();
    if (!superAdminRole) {
      throw new Error('SUPER_ADMIN role not found');
    }
    return superAdminRole._id;
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(8).toString('hex');
    const hash = (await scrypt(password, salt, 32)) as Buffer;
    return `${salt}.${hash.toString('hex')}`;
  }
}
