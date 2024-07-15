import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Category extends Document {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    description: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null })
    parent_category_id: mongoose.Types.ObjectId;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
CategorySchema.index({ name: 'text' });
