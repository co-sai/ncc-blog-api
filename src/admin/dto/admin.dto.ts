import { Expose, Exclude } from "class-transformer";

export class AdminDto {
    @Expose()
    id: number;
    
    @Expose()
    first_name : string;

    @Expose()
    last_name : string;

    @Expose()
    email: string;

    @Expose()
    country_code : string;

    @Expose()
    phone_number : string;

    @Expose()
    photo : string;

    @Expose()
    avatar : string;

    @Expose()
    role: string;
}
