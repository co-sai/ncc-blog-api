import { Model } from 'mongoose';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Admin } from './schema/admin.schema';
import { Role } from './schema/role.schema';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';
import { CreateAdminDto } from './dto/create-admin.dto';

const scrypt = promisify(_scrypt);

@Injectable()
export class AdminService {
    constructor(
        @InjectModel(Admin.name) private adminModel: Model<Admin>,
        @InjectModel(Role.name) private roleModel: Model<Role>,
    ) { }

    async signIn(body: any): Promise<Admin> {
        const admin = await this.adminModel.findOne({ email: body.email.toLowerCase() })
            .populate({
                path: "role_id",
                select: "_id name"
            })
            .exec();
        if (!admin) {
            throw new InternalServerErrorException("An account with this email address was not found. Please try a different sign in method or contact support if you are unable to access your account.");
        }

        const [salt, storedHash] = admin.password.split('.');

        const hash = (await scrypt(body.password, salt, 32)) as Buffer;

        if (storedHash !== hash.toString("hex")) {
            throw new InternalServerErrorException("Incorrect email or password.");
        }
        return admin;
    }

    async findByEmail(email: string) {
        const exAdmin = this.adminModel.findOne({ email: email.toLowerCase() }).exec();
        return exAdmin;
    }

    async findOne(reset_token: string) {
        return this.adminModel.findOne({
            reset_token: reset_token,
            reset_token_expiration: { $gt: Date.now() }
        })
    }

    async findById(id: any): Promise<Admin> {
        const result = this.adminModel.findById(id)
            .populate({
                path: "role_id",
                select: "_id name"
            })
            .exec();
        return result;
    }

    async doHashPassword(password: string) {
        const salt = randomBytes(8).toString('hex');

        const hash = (await scrypt(password, salt, 32)) as Buffer;

        const result = salt + '.' + hash.toString('hex');

        return result;
    }

    async signUp(body: CreateAdminDto): Promise<Admin> {
        const salt = randomBytes(8).toString('hex');

        const hash = (await scrypt(body.password, salt, 32)) as Buffer;

        const result = salt + '.' + hash.toString('hex');

        const admin = new this.adminModel({ ...body, password: result });
        await admin.save();

        return admin;
    }

    async findByIdAndDelete(id: string) {
        await this.adminModel.findByIdAndDelete(id);
        return;
    }

    async findRoleById(id: any) {
        const role = await this.roleModel.findById(id).select("_id name").exec();
        return role;
    }

    async adminList(){
        return this.adminModel.find()
        .populate({
            path : "role_id",
            select : "_id name"
        })
        .select("-password -reset_token -reset_token_expiration -__v").exec();
    }

    async findAllRole(){
        const role = await this.roleModel.find().exec();
        return role;
    }
}
