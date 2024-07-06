import { Body, Controller, Post, UploadedFiles, UseGuards, UseInterceptors, Request } from '@nestjs/common';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';

import { BlogService } from './blog.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CreateBlogDto } from './dto/create-blog.dto';
import { FileService } from 'src/common/file/file.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { RequestInterface } from 'src/interface/request.interface';

const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);

@UseGuards(JwtAuthGuard)
@Controller({ path: "blog", version: "1" })
export class BlogController {
    constructor(
        private readonly blogService: BlogService,
        private readonly fileService: FileService,
        private readonly configService: ConfigService
    ) { }

    @Post("add")
    @UseInterceptors(FileFieldsInterceptor(
        [
            { name: 'medias', maxCount: 5 },
        ]
    ))
    async createBlog(
        @Body() body: CreateBlogDto,
        @UploadedFiles() files: { medias?: Array<Express.Multer.File> },
        @Request() req: RequestInterface
    ) {
        const admin_id = req.user._id;
        let mediasFileName: string[] = [];
        try {
            const uploadFolder = path.join(process.cwd(), 'uploads', 'blog');
            if (files.medias && files.medias.length >= 1) {
                mediasFileName = files.medias.map((file) => (path.join(uploadFolder, file.filename)));
            }
        } catch (error) {
            throw error;
        }
    }
}
