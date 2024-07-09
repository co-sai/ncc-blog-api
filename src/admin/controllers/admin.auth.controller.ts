import { Body, Controller, Get, InternalServerErrorException, Post, UseGuards, Request, HttpCode } from '@nestjs/common';
import * as crypto from 'crypto';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';

import { AdminService } from '../admin.service';
import { AuthService } from 'src/auth/auth.service';
import { RequestInterface } from 'src/interface/request.interface';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { MailService } from 'src/mail/services/mail.service';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

const scrypt = promisify(_scrypt);

@ApiTags("Admin Authentication API")
@Controller({ path: "auth/admin", version: "1" })
export class AdminAuthController {
    constructor(
        private readonly adminService: AdminService,
        private readonly authService: AuthService,
        private readonly mailService: MailService

    ) { }

    @Post("sign-in")
    @HttpCode(200)
    @ApiOperation({ summary: "Admin Login" })
    @ApiResponse({ status: 200, description: "Success." })
    @ApiBody({
        description: 'Admin login data',
        required: true,
        examples: {
            example1: {
                summary: 'Admin login example',
                value: {
                    email: 'superadmin@gmail.com',
                    password: 'password@123',
                }
            }
        }
    })
    async signIn(
        @Body() body: any
    ) {
        const admin = await this.adminService.signIn(body);
        const { access_token } = await this.authService.generateToken(admin);
        const { password, reset_token, reset_token_expiration, ...result } = admin.toJSON();

        return {
            message: "Success.",
            data: {
                admin : result,
                access_token
            }
        }
    }

    @Post('forget-password')
    @HttpCode(200)
    @ApiOperation({ summary: "Admin forget password" })
    @ApiResponse({ status: 200, description: "Check your mail for a link to reset your password." })
    @ApiBody({
        description: 'Admin forget password',
        required: true,
        examples: {
            example1: {
                summary: 'Admin forget password example',
                value: {
                    email: 'superadmin@gmail.com',
                }
            }
        }
    })
    async forgetPassword(@Body() body: { email: string }) {
        const email = body.email;

        const account = await this.adminService.findByEmail(email);
        if (!account) {
            throw new InternalServerErrorException("Account not found.");
        }

        const reset_token = crypto.randomBytes(32).toString("hex");

        account.reset_token = reset_token;
        account.reset_token_expiration = new Date(Date.now() + 3600000);
        await account.save();

        // Need to pass base url for /auth/admin/
        const route = "auth/admin";
        const template = "reset-password.template.html";
        await this.mailService.sendMail(route, template, reset_token, account.email, "Reset your password", "Reset your password");

        return {
            message: "Check your mail for a link to reset your password"
        }
    }

    @Post('reset-password')
    @HttpCode(200)
    @ApiOperation({ summary: "Admin reset password" })
    @ApiResponse({ status: 200, description: "Password has been updated successfully." })
    @ApiBody({
        description: 'Admin reset password',
        required: true,
        examples: {
            example1: {
                summary: 'Admin reset password example',
                value: {
                    reset_token: 'token',
                    password: "new-password"
                }
            }
        }
    })
    async resetPassword(
        @Body() body: any
    ) {
        const token = body.reset_token;
        const newPassword = body.password;

        const account = await this.adminService.findOne(token);

        if (!account) {
            throw new InternalServerErrorException("Account not found.");
        }

        const result = await this.adminService.doHashPassword(newPassword);

        account.password = result;
        account.reset_token = undefined;
        account.reset_token_expiration = undefined;

        await account.save();

        const { access_token } = await this.authService.generateToken(account);
        const { password, reset_token, reset_token_expiration, ...accountResult } = account.toJSON();
        return {
            message: "Password has been updated successfully.",
            data: {
                admin : accountResult,
                access_token,
            }
        }
    }

    @UseGuards(JwtAuthGuard)
    @Post("update-password")
    @HttpCode(200)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Admin update password" })
    @ApiResponse({ status: 200, description: "Password has been updated." })
    @ApiBody({
        description: 'Admin update password',
        required: true,
        examples: {
            example1: {
                summary: 'Admin update password example',
                value: {
                    password: "new-password"
                }
            }
        }
    })
    async updatePassword(
        @Request() req : RequestInterface,
        @Body() body : { password : string }
    ){
        const user_id = req.user._id;
        const account = await this.adminService.findById(user_id);
        if(!account){
            throw new InternalServerErrorException("Account not found.");
        }

        const hashedPassword = await this.adminService.doHashPassword(body.password);

        account.password = hashedPassword;
        await account.save();

        const { password, reset_token, reset_token_expiration, ...accountResult } = account.toJSON();

        return {
            message : "Password has been updated.",
            data : {
                admin : accountResult
            }
        }
    }

}
