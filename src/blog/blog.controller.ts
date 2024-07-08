"use strict";
import { Controller, Get, Post, Patch, Param, Body, UploadedFiles, Request, UseGuards, UseInterceptors, InternalServerErrorException } from '@nestjs/common';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { BlogService } from './blog.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateBlogDto } from './dto/create-blog.dto';
import { CategoryService } from '../category/category.service';
import { FileService } from '../common/file/file.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Public } from '../decorators/public.decorators';

const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);

@Controller({ path: "blog", version: "1" })
@UseGuards(JwtAuthGuard)
export class BlogController {
    constructor(
        private readonly blogService: BlogService,
        private readonly fileService: FileService,
        private readonly configService: ConfigService,
        private readonly categoryService: CategoryService,
    ) { }

    @Post("add")
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'medias', maxCount: 5 },
    ]))
    async createBlog(
        @Body() body: CreateBlogDto,
        @UploadedFiles() files: any,
        @Request() req: any,
    ): Promise<any> {
        const admin_id = req.user._id;
        let mediasFileName = [];

        try {
            const uploadFolder = path.join(process.cwd(), 'uploads', 'blog');

            if (files.medias && files.medias.length >= 1) {
                mediasFileName = files.medias.map((file: any) => path.join(uploadFolder, file.filename));
            }

            const category = await this.categoryService.findOne(body.category_id);

            if (!category) {
                await this.fileService.deleteFiles(mediasFileName);
                throw new InternalServerErrorException("Category not found.");
            }

            const blog = await this.blogService.createBlog(body, admin_id);

            if (files.medias) {
                let media_files_names = [];

                for (const file of files.medias) {
                    const newFilename = await this.fileService.generateFileName(`${file.filename}-${uniqueSuffix}-related`, file, 'uploads/blog');
                    media_files_names.push(`uploads/blog/${newFilename}`);
                }

                blog.medias = media_files_names;

                if (+body.main_media_index !== undefined && +body.main_media_index < media_files_names.length) {
                    blog.main_media = media_files_names[+body.main_media_index];
                } else {
                    blog.main_media = media_files_names[0];
                }
            }

            await blog.save();

            return {
                message: "Success",
                data: blog
            };
        } catch (error) {
            throw error;
        }
    }

    @Public()
    @Get(":id")
    async blogDetail(@Param("id") id: string): Promise<any> {
        const data = await this.blogService.findById(id);

        if (!data) {
            throw new InternalServerErrorException("Blog data not found.");
        }

        data.view = +data.view + 1;
        await data.save();

        return {
            data
        };
    }

    @Patch(":id")
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'medias', maxCount: 5 },
        { name: 'new_medias', maxCount: 5 }
    ]))
    async updateBlog(
        @Param("id") id: string,
        @Body() body: any,
        @UploadedFiles() files: any,
        @Request() req: any,
    ): Promise<any> {
        const admin_id = req.user._id;
        const { mediasIndices, medias_to_remove } = body;
        let mediasFileName = [];
        let newMediasFileName = [];
        const uploadFolder = path.join(process.cwd(), 'uploads', 'blog');

        if (files.medias && files.medias.length >= 1) {
            mediasFileName = files.medias.map((file: any) => path.join(uploadFolder, file.filename));
        }

        if (files.new_medias && files.new_medias.length >= 1) {
            newMediasFileName = files.new_medias.map((file: any) => path.join(uploadFolder, file.filename));
        }

        const blog = await this.blogService.findById(id);

        if (!blog) {
            await this.fileService.deleteFilesIfExist(mediasFileName, newMediasFileName);
            throw new InternalServerErrorException("Blog data not found.");
        }

        if (blog.category_id.toString() !== body.category_id.toString()) {
            const category = await this.categoryService.findSubCategoryById(body.category_id.toString());

            if (!category) {
                await this.fileService.deleteFilesIfExist(mediasFileName, newMediasFileName);
                throw new InternalServerErrorException("Category Not found.");
            }
        }

        const updatedBlog = await this.blogService.findByIdAndUpdate(id, body);
        const mediasIndicesArray = mediasIndices ? JSON.parse(mediasIndices.replace(/^"(.*)"$/, '$1')) : null;

        if (files.medias && mediasIndicesArray) {
            if (files.medias.length !== mediasIndicesArray.length) {
                await this.fileService.deleteFilesIfExist(mediasFileName, newMediasFileName);
                throw new InternalServerErrorException('The number of related images and indices must match.');
            }

            for (let i = 0; i < mediasIndicesArray.length; i++) {
                const index = mediasIndicesArray[i];

                if (index < 0 || index >= updatedBlog.medias.length) {
                    await this.fileService.deleteFilesIfExist(mediasFileName, newMediasFileName);
                    throw new InternalServerErrorException(`Invalid related image index: ${index}.`);
                }

                const newImageFile = files.medias[i];
                const newFilename = await this.fileService.generateFileName(`${newImageFile.filename}-${uniqueSuffix}-related`, newImageFile, 'uploads/blog');
                await this.fileService.deleteFiles([path.join(process.cwd(), updatedBlog.medias[index])]);
                
                updatedBlog.medias[index] = `uploads/blog/${newFilename}`;
            }
        } else {
            await this.fileService.deleteFilesIfExist(mediasFileName, []);
        }

        const mediaToRemoveArray = medias_to_remove ? JSON.parse(medias_to_remove.replace(/^"(.*)"$/, '$1')) : null;

        if (medias_to_remove && mediaToRemoveArray.length > 0) {
            const indicesToRemove = mediaToRemoveArray;
            indicesToRemove.sort((a, b) => b - a);

            for (const index of indicesToRemove) {
                if (index < 0 || index >= updatedBlog.medias.length) {
                    await this.fileService.deleteFilesIfExist(mediasFileName, newMediasFileName);
                    throw new InternalServerErrorException(`Invalid related image index: ${index}.`);
                }

                await this.fileService.deleteFiles([path.join(process.cwd(), updatedBlog.medias[index])]);
                updatedBlog.medias.splice(index, 1);
            }
        }

        if (files.new_medias) {
            let media_files_names = [];

            for (const file of files.new_medias) {
                const newFilename = await this.fileService.generateFileName(`${file.filename}-${uniqueSuffix}-related`, file, 'uploads/blog');
                media_files_names.push(`uploads/blog/${newFilename}`);
            }

            if (media_files_names.length > 0) {
                updatedBlog.medias.push(...media_files_names.map(file => file));
            }

            if (+body.main_media_index !== undefined && +body.main_media_index < media_files_names.length) {
                blog.main_media = media_files_names[+body.main_media_index];
            } else {
                blog.main_media = media_files_names[0];
            }
        }

        await updatedBlog.save();

        return {
            data: updatedBlog
        };
    }
}
