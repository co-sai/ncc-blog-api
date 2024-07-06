import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

function toUpper(val: string): string {
    return val.toUpperCase();
}

@Schema({ timestamps: true })
export class Role extends Document {

    @Prop({ required: true, set : toUpper })
    name: string;
}

export const RoleSchema = SchemaFactory.createForClass(Role);