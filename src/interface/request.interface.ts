import { Request as ExpressRequest } from 'express';
export interface RequestInterface extends ExpressRequest {
    user: {
        _id: string;
        email: string;
    };
}