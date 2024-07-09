import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ timestamps: true })
export class Feedback extends Document {
    @Prop({ required: true })
    email: string;

    @Prop({ required: true })
    content: string;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);
