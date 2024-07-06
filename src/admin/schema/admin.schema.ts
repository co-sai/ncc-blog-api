import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

function toUpper(val: string): string {
    return val.toUpperCase();
}
function toLower(val: string): string {
    return val.toLowerCase();
}
export enum AdminRole {
    USER = 'USER',
    SUPER_ADMIN = 'SUPER_ADMIN',
    ADMIN = "ADMIN"
}

@Schema({ timestamps: true })
export class Admin extends Document {

    @Prop({ required: true })
    first_name: string;

    @Prop()
    last_name: string;

    @Prop({ required: true, unique: true, set : toLower })
    email: string;

    @Prop({ required : true})
    country_code : string

    @Prop({ required : true })
    phone_number : string;

    @Prop({ default : null })
    photo : string;

    @Prop({ default : null })
    avatar : string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true })
    role_id: mongoose.Types.ObjectId;

    @Prop({ required: true })
    password: string;

    @Prop({ default : null })
    reset_token : string;

    @Prop({ default : null })
    reset_token_expiration : Date;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);