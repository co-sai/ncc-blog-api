import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ timestamps: true })
export class Blog extends Document {
    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    content: string;

    @Prop({ default: null })
    main_media: string;

    @Prop({ default: null })
    medias: string[];

    @Prop({ required: true })
    external_link: string;

    @Prop({ required: true })
    message_link: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Category' })
    category_id: mongoose.Types.ObjectId;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true })
    admin_id: mongoose.Types.ObjectId;
}

export const BlogSchema = SchemaFactory.createForClass(Blog);
