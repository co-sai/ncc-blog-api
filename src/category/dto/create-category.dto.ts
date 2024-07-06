import * as mongoose from 'mongoose';
import { IsNotEmpty, IsString, IsOptional, ValidateNested, IsArray, IsMongoId  } from "class-validator";
import { Prop } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
    @ApiProperty({ example: 'Electronic'})
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'Electronic Category'})
    @IsString()
    @IsNotEmpty()
    description: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Category' })
    @IsOptional()
    @Type(() => mongoose.Types.ObjectId)
    parent_category_id: mongoose.Types.ObjectId;
}
