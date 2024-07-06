import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(
        private readonly jwtService : JwtService
    ) { }

    async generateToken(user: any): Promise<{ access_token: string }> {
        const payload = {
            _id: user._id,
            ...(user.email ? { email: user.email } : { phone_number: user.phone_number })
        };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }
}
