import { IsNotEmpty, IsString, IsEmail, IsMongoId  } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';
import { Prop } from "@nestjs/mongoose";
import mongoose from "mongoose";
import { Type } from "class-transformer";

export class CreateFeedbackDto {
    @ApiProperty({ example: 'example@example.com'})
    @IsEmail()
    @IsNotEmpty()
    email : string;

    @ApiProperty({ example: 'Electronic computer...'})
    @IsString()
    @IsNotEmpty()
    content: string;
}
