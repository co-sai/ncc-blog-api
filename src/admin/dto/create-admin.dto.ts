import * as mongoose from 'mongoose';
import { Prop } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, MinLength, Matches, IsString, IsMongoId } from "class-validator";
import { AdminRole } from "../schema/admin.schema";

export class CreateAdminDto {
    @ApiProperty({ example: 'John' })
    @IsString()
    first_name: string;

    @ApiProperty({ example: 'John' })
    @IsString()
    @IsOptional()
    last_name: string;

    @ApiProperty({ example: 'john@gmail.com' })
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiProperty({ example: '0925000000' })
    @IsString()
    @IsOptional()
    country_code?: string;

    @ApiProperty({ example: '0925000000' })
    @IsString()
    @IsOptional()
    phone_number?: string;

    @IsString()
    @IsOptional()
    photo?: string;

    @IsString()
    @IsOptional()
    avatar?: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Role' })
    @IsNotEmpty()
    @IsMongoId()
    @Type(() => mongoose.Types.ObjectId)
    role_id?: string;

    @ApiProperty({ example: 'password' })
    @IsNotEmpty()
    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    @Matches(/(?=.*[a-zA-Z])/, { message: 'Password must contain at least one letter' })
    @Matches(/(?=.*[0-9])/, { message: 'Password must contain at least one number' })
    @Matches(/(?=.*[!@#$%^&*])/, { message: 'Password must contain at least one special character' })
    password: string;
}
