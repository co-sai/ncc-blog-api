import * as mongoose from 'mongoose';
import { IsNotEmpty, IsString, IsOptional, ValidateNested, IsArray, IsMongoId, IsNumber, IsBoolean, IsInt  } from "class-validator";
import { Prop } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBlogDto {
    @ApiProperty({ example: 'Computer'})
    @IsString()
    @IsNotEmpty()
    title : string;

    @ApiProperty({ example: 'Electronic computer...'})
    @IsString()
    @IsNotEmpty()
    content: string;

    @IsString()
    @IsNotEmpty()
    external_link: string;

    @IsString()
    @IsNotEmpty()
    message_link: string;

    @IsString()
    @IsNotEmpty()
    rank: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Category' })
    @IsNotEmpty()
    @IsMongoId()
    @Type(() => mongoose.Types.ObjectId)
    category_id: mongoose.Types.ObjectId;
}
