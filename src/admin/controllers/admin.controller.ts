import * as crypto from 'crypto';
import * as path from 'path';
import { promisify } from 'util';
import { diskStorage } from 'multer';
import { Body, Controller, Get, InternalServerErrorException, Post, UseGuards, Request, HttpCode, UseInterceptors, UploadedFiles, Delete, Param, Patch } from '@nestjs/common';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

import { ConfigService } from '@nestjs/config';

import { AdminService } from '../admin.service';
import { AuthService } from 'src/auth/auth.service';
import { MailService } from 'src/mail/services/mail.service';
import { FileService } from 'src/common/file/file.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

import { RequestInterface } from 'src/interface/request.interface';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

const scrypt = promisify(_scrypt);
const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);

@ApiTags("Admin API")
@UseGuards(JwtAuthGuard)
@Controller({ path: "admin", version: "1" })
export class AdminController {
    constructor(
        private readonly adminService: AdminService,
        private readonly authService: AuthService,
        private readonly mailService: MailService,
        private readonly fileService: FileService,
        private readonly configService: ConfigService
    ) { }

    @Get("profile")
    @HttpCode(200)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Current logged-in admin profile" })
    async adminProfile(@Request() req: RequestInterface) {
        const id = req.user._id;
        const admin = await this.adminService.findById(id);
        const { password, reset_token, reset_token_expiration, ...result } = admin.toJSON();
        return {
            data: result
        }
    }

    @Get("list")
    @HttpCode(200)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Admin list" })
    async adminList(@Request() req: RequestInterface) {
        const { role_id } = (await this.adminService.findById(req.user._id)).toJSON();
        if (!role_id) {
            throw new InternalServerErrorException("Account not found.");
        }
        if (role_id.name !== "SUPER_ADMIN") {
            throw new InternalServerErrorException("You are not allowed to view admin list.");
        }

        const admins = await this.adminService.adminList();
        return {
            data: admins
        }
    }

    @Get("role")
    @HttpCode(200)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Role list" })
    async findAllRole() {
        const role = await this.adminService.findAllRole();
        return {
            data: role
        }
    }

    @Get("/:id")
    @HttpCode(200)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Admin detail" })
    async adminDetail(
        @Request() req: RequestInterface,
        @Param("id") id: string
    ) {
        const { role_id } = (await this.adminService.findById(req.user._id)).toJSON();
        if (!role_id) {
            throw new InternalServerErrorException("Account not found.");
        }
        if (role_id.name !== "SUPER_ADMIN") {
            throw new InternalServerErrorException("You are not allowed to view admin detail.");
        }
        const admin = await this.adminService.findById(id);
        const { password, reset_token, reset_token_expiration, ...result } = admin.toJSON();
        return {
            data: result
        }
    }

    @Post('create')
    @HttpCode(201)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: "Create new Admin By Super Admin" })
    @ApiResponse({ status: 201, description: "Success." })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Create Admin',
        schema: {
            type: 'object',
            properties: {
                first_name: { type: 'string', example: "first name" },
                last_name: { type: 'string', example: "last name" },
                email: { type: 'string', example: "admin@gmail.com" },
                country_code: { type: 'string', example: "+95"},
                phone_number: { type: 'string', example: "9299999999" },
                role_id: { type: 'string', example: "66836a97dc331c20cbbdc8f2" },
                password: { type: 'string', example: "admin@123" },
                photo: { type: 'string', format: 'binary' }
            },
        },
    })
    @UseInterceptors(FileFieldsInterceptor(
        [
            { name: 'photo', maxCount: 1 },
        ]
    ))
    async createAdminOrUserAccount(
        @Body() body: CreateAdminDto,
        @UploadedFiles() files: { photo?: Express.Multer.File },
        @Request() req: RequestInterface
    ) {
        let filenames: string[] = [];

        try {
            // Store original file names as a temp data
            // Extract filenames from the files object and store them in an array
            const uploadFolder = path.join(process.cwd(), 'uploads', 'admin');
            if (files.photo) {
                filenames.push(path.join(uploadFolder, files.photo[0].filename));
            }

            /* Start - Check Current user role and permission */
            const { role_id } = (await this.adminService.findById(req.user._id)).toJSON();
            if (role_id.name !== "SUPER_ADMIN") {
                await this.fileService.deleteFiles(filenames);
                throw new InternalServerErrorException("You are not allowed to create new account.");
            }

            // Now `filenames` array contains the filenames of both photos and avatars
            const exAdmin = await this.adminService.findByEmail(body.email);

            if (exAdmin) {
                await this.fileService.deleteFiles(filenames);
                throw new InternalServerErrorException("Account already exist with that mail. Try with another one.");
            }

            const admin = await this.adminService.signUp(body);

            if (files.photo) {
                const newFilename = await this.fileService.generateFileName(`${files.photo[0].filename}-${uniqueSuffix}-photo`, files.photo[0], "uploads/admin");
                admin.photo = `uploads/admin/${newFilename}`;
            } else {
                admin.avatar = `uploads/avatar/avatar.jpg`;
            }

            await admin.save();

            const { access_token } = await this.authService.generateToken(admin);
            const { password, reset_token, reset_token_expiration, ...result } = admin.toJSON();

            /* Send Login Credential Mail to Admin / User */
            await this.mailService.sendLoginCredentialMail(body.email, body.password, admin.email, "Login Credential", "Login Credential")

            return {
                message: "Success.",
                data: {
                    result,
                    access_token
                }
            }
        } catch (err) {
            throw err;
        }
    }

    @Patch("/:id")
    @HttpCode(200)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Update Admin By Super Admin / It-self" })
    @ApiResponse({ status: 200, description: "Account has been updated." })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Update Admin',
        schema: {
            type: 'object',
            properties: {
                first_name: { type: 'string', nullable : true, example: "Updated First name" },
                last_name: { type: 'string', nullable : true, example: "Updated Last name" },
                email: { type: 'string', nullable : true, example: "Updated email" },
                country_code: { type: 'string', nullable : true, example: "+95" },
                phone_number: { type: 'string', nullable : true, example: "9888888888" },
                role_id: { type: 'string', nullable : true, example: "66836a97dc331c20cbbdc8f2" },
                photo: { type: 'string', format: 'binary', nullable : true }
            }
        },
    })
    @UseInterceptors(FileFieldsInterceptor(
        [
            { name: 'photo', maxCount: 1 },
        ]
    ))
    async adminUpdateProfile(
        @Param("id") id: string,
        @Body() body: Partial<CreateAdminDto>,
        @UploadedFiles() files: { photo?: Express.Multer.File },
        @Request() req: RequestInterface
    ) {
        const { _id } = req.user;

        let filenames: string[] = [];
        const uploadFolder = path.join(process.cwd(), 'uploads', 'admin');
        if (files.photo) {
            filenames.push(path.join(uploadFolder, files.photo[0].filename));
        }

        if (_id.toString() !== id.toString()) {
            // check permission
            const { role_id } = (await this.adminService.findById(_id)).toJSON();
            if (role_id.name !== "SUPER_ADMIN") {
                await this.fileService.deleteFiles(filenames);
                throw new InternalServerErrorException("You don't have the permission to modify admin data.")
            }
        }

        const admin = await this.adminService.findById(id);

        if (!admin) {
            await this.fileService.deleteFiles(filenames);
            throw new InternalServerErrorException("Account not found.");
        }

        // check updated mail is already exist or not.
        // if already exist. Not accept that mail
        if (body.email) {
            if (admin.email.toLowerCase() !== body.email.toLowerCase()) {
                const exAdmin = await this.adminService.findByEmail(body.email);
                if (exAdmin) {
                    await this.fileService.deleteFiles(filenames);
                    throw new InternalServerErrorException("Email address already in-used.");
                }
            }
        }

        const { photo, password, ...adminBody } = body;
        Object.assign(admin, adminBody);

        if (files.photo) {
            // check old file and delete it
            if (admin.photo) {
                await this.fileService.deleteFiles([path.join(process.cwd(), admin.photo)]);
            }

            const newFilename = await this.fileService.generateFileName(`${files.photo[0].filename}-${uniqueSuffix}-photo`, files.photo[0], "uploads/admin");
            admin.photo = `uploads/admin/${newFilename}`;
        } else {
            admin.photo = admin.photo;
        }

        await admin.save();

        const role = await this.adminService.findRoleById(admin.role_id);

        return {
            data: {
                admin: {
                    _id: admin._id,
                    first_name: admin.first_name,
                    last_name: admin.last_name,
                    email: admin.email,
                    country_code: admin.country_code,
                    phone_number: admin.phone_number,
                    photo: admin.photo,
                    avatar: admin.avatar,
                    role_id: role
                },
                message: "Account has been updated."
            }
        }
    }

    @Delete("/:id")
    @HttpCode(200)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Delete admin account by Super Admin / It-self" })
    async deleteAccount(
        @Param("id") id: string,
        @Request() req: RequestInterface
    ) {
        const _id = req.user._id;

        if (_id.toString() !== id.toString()) {
            // check permission
            const { role_id } = (await this.adminService.findById(_id)).toJSON();
            if (role_id.name !== "SUPER_ADMIN") {
                throw new InternalServerErrorException("You don't have the permission.")
            }
        }
        const account = await this.adminService.findById(id);
        if (!account) {
            throw new InternalServerErrorException("Account not found.");
        }

        const uploadFolder = path.join(process.cwd(), 'uploads', 'admin');
        let filenames: string[] = [];
        if (account.photo) {
            const photo_file_name = await this.fileService.getFilenameFromUrl(account.photo);
            filenames.push(path.join(uploadFolder, photo_file_name));
        }

        await this.fileService.deleteFiles(filenames);

        await this.adminService.findByIdAndDelete(id);

        return {
            message: "Account has been deleted."
        }

    }

}
