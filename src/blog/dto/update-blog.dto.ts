import * as mongoose from 'mongoose';
import { IsNotEmpty, IsString, IsOptional, ValidateNested, IsArray, IsMongoId, IsNumber, IsBoolean, IsInt  } from "class-validator";
import { Prop } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBlogDto {
    @ApiProperty({ example: 'Computer'})
    @IsString()
    @IsOptional()
    title : string;

    @ApiProperty({ example: 'Electronic computer...'})
    @IsString()
    @IsOptional()
    content: string;

    @IsString()
    @IsOptional()
    external_link: string;

    @IsString()
    @IsOptional()
    message_link: string;

    @IsString()
    @IsOptional()
    rank: string;

    /** These two are one pair => medias and mediasIndices */
    medias?: Express.Multer.File[];

    medias_to_remove?: any;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Category' })
    @IsNotEmpty()
    @IsMongoId()
    @Type(() => mongoose.Types.ObjectId)
    category_id: mongoose.Types.ObjectId;
}
