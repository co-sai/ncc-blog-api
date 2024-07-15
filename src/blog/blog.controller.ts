"use strict";
import { Controller, Get, Post, Patch, Param, Body, UploadedFiles, Request, UseGuards, UseInterceptors, InternalServerErrorException, Delete, Query, HttpCode } from '@nestjs/common';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { BlogService } from './blog.service';
import { AdminService } from 'src/admin/admin.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateBlogDto } from './dto/create-blog.dto';
import { CategoryService } from '../category/category.service';
import { FileService } from '../common/file/file.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Public } from '../decorators/public.decorators';
import { RequestInterface } from 'src/interface/request.interface';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { FeedbackService } from 'src/feedback/feedback.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);

import { IsIn } from 'class-validator';
import { Blog } from './schema/blog.schema';

export class BlogListFilterDto {
    @IsIn(['rank', 'view'])
    q: string;
    limit: string;
    page: string
}

@ApiTags("Blog API")
@Controller({ path: "blog", version: "1" })
@UseGuards(JwtAuthGuard)
export class BlogController {
    constructor(
        private readonly blogService: BlogService,
        private readonly fileService: FileService,
        private readonly configService: ConfigService,
        private readonly categoryService: CategoryService,
        private readonly adminService: AdminService,
        private readonly feedbackService: FeedbackService
    ) { }

    @Public()
    @Get()
    @HttpCode(200)
    @ApiOperation({ summary: "Blogs filter by Rank or View or Random" })
    @ApiResponse({ status: 200, description: "Blogs list" })
    @ApiQuery({ name: 'q', required: false, description: 'Filter by rank or view or random' })
    @ApiQuery({ name: 'limit', required: false, description: 'Limit the number of results' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination' })
    async blogListFilterByViewAndRank(
        @Query() query: any,
    ): Promise<{ data: Blog[], total_count: number, limit: number, page: number }> {
        const q = query.q;
        const page = +query.page || 1;
        const limit = +query.limit || 20
        const random = query.random === 'true';

        const { blogs, total_count } = await this.blogService.filterAndSortBlogs(q, limit, page, random);

        return {
            data: blogs,
            total_count,
            limit,
            page
        };
    }

    @Post("add")
    @HttpCode(201)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Create new blog" })
    @ApiResponse({ status: 201, description: "Blog has been created successfully." })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Create new blog',
        schema: {
            type: 'object',
            properties: {
                title: { type: 'string', nullable: true, example: "IPhone 15 Pro Max" },
                content: { type: 'string', nullable: true, example: "IPhone 15 Pro Max" },
                external_link: { type: 'string', nullable: true, example: "external_link" },
                message_link: { type: 'string', nullable: true, example: "message_link" },
                rank: { type: 'string', nullable: true, example: "1" },
                category_id: { type: 'string', nullable: true, example: "sub-category Id" },
                medias: {
                    type: 'array',
                    items: {
                        type: 'string',
                        format: 'binary',
                    },
                    nullable: true,
                },
                main_media_index: { type: 'string', example: '0' }
            }
        }
    })
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
    @HttpCode(200)
    @ApiOperation({ summary: "Blog Detail" })
    @ApiResponse({ status: 200, description: "Blog detail" })
    async blogDetail(
        @Param("id") id: string,
    ): Promise<any> {
        const blog = await this.blogService.findById(id);
        if (!blog) {
            throw new InternalServerErrorException("Blog data not found.");
        }

        blog.view = +blog.view + 1;
        await blog.save();

        return {
            data: {
                blog
            }
        };
    }

    /** We don't update main_media */
    @Patch(":id")
    @HttpCode(200)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Update blog" })
    @ApiResponse({ status: 200, description: "Blog has been updated successfully." })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Update blog',
        schema: {
            type: 'object',
            properties: {
                title: { type: 'string', nullable: true, example: "IPhone 15 Pro Max" },
                content: { type: 'string', nullable: true, example: "IPhone 15 Pro Max" },
                external_link: { type: 'string', nullable: true, example: "external_link" },
                message_link: { type: 'string', nullable: true, example: "message_link" },
                rank: { type: 'string', nullable: true, example: "1" },
                category_id: { type: 'string', nullable: true, example: "sub-category Id" },
                medias: {
                    type: 'array',
                    items: {
                        type: 'string',
                        format: 'binary',
                    },
                    nullable: true,
                },
                mediasIndices: { type: "string", nullable: true, example: "[0,1]" },
                medias_to_remove: { type: "string", nullable: true, example: "[0,1]" },
                new_medias: {
                    type: 'array',
                    items: {
                        type: 'string',
                        format: 'binary',
                    },
                    nullable: true,
                },
            }
        }
    })
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'medias', maxCount: 5 },
        { name: 'new_medias', maxCount: 5 }
    ]))
    async updateBlog(
        @Param("id") id: string,
        @Body() body: Partial<UpdateBlogDto>,
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

        /** Start - Used "files.medias" and "mediasIndices" to update image from related images array */
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
        /** Start - Used "files.medias" and "mediasIndices" to update image from related images array */

        /** Start - Remove medias from medias array */
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
        /** End - Remove medias from medias array */

        /**  Start - Process new medias (if any) */
        if (files.new_medias) {
            let media_files_names = [];

            for (const file of files.new_medias) {
                const newFilename = await this.fileService.generateFileName(`${file.filename}-${uniqueSuffix}-related`, file, 'uploads/blog');
                media_files_names.push(`uploads/blog/${newFilename}`);
            }

            if (media_files_names.length > 0) {
                updatedBlog.medias.push(...media_files_names.map(file => file));
            }
        }
        /**  End - Process new medias (if any) */

        await updatedBlog.save();

        return {
            data: updatedBlog
        };
    }

    @Patch(":id/set-main-media")
    @HttpCode(200)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Update blog main-media" })
    @ApiResponse({ status: 200, description: "success" })
    @ApiBody({
        description: 'Update blog main-media',
        required: true,
        examples: {
            example1: {
                summary: 'Update blog main-media',
                value: {
                    main_media_index: '0',
                }
            }
        }
    })
    async setMainMedia(
        @Param("id") id: string,
        @Body() body: { main_media_index: number }
    ): Promise<any> {
        const { main_media_index } = body;

        const blog = await this.blogService.findById(id);

        if (!blog) {
            throw new InternalServerErrorException("Blog data not found.");
        }

        if (main_media_index < 0 || main_media_index >= blog.medias.length) {
            throw new InternalServerErrorException("Invalid main media index.");
        }

        blog.main_media = blog.medias[main_media_index];
        await blog.save();

        return {
            message: "Main media updated successfully",
            data: blog
        };
    }

    @Patch(":id/set-rank")
    @HttpCode(200)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Update blog rank" })
    @ApiResponse({ status: 200, description: "success" })
    @ApiBody({
        description: 'Update blog rank',
        required: true,
        examples: {
            example1: {
                summary: 'Update blog rank',
                value: {
                    rank: 2,
                }
            }
        }
    })
    async setRank(
        @Param("id") id: string,
        @Body() body: { rank: number }
    ): Promise<any> {
        const { rank } = body;

        const blog = await this.blogService.findById(id);

        if (!blog) {
            throw new InternalServerErrorException("Blog data not found.");
        }

        blog.rank = rank
        await blog.save();

        return {
            message: "Rank updated successfully",
            data: blog
        };
    }

    // Delete Product -> Done - Need to remove old image from product
    @Delete("/:id")
    @HttpCode(200)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Delete blog" })
    @ApiResponse({ status: 200, description: "success" })
    async deleteProduct(@Param("id") id: string, @Request() req: RequestInterface) {
        const _id = req.user._id;
        const { role_id } = (await this.adminService.findById(_id)).toJSON();
        if (role_id.name !== "SUPER_ADMIN") {
            throw new InternalServerErrorException("You don't have the permission.")
        }
        const blog = await this.blogService.findById(id);
        if (!blog) {
            throw new InternalServerErrorException("Blog not found.");
        }

        if (blog.medias.length > 0) {
            const fileName: string[] = blog.medias.map((file) => path.join(process.cwd(), file));
            await this.fileService.deleteFiles(fileName);
        }

        // delete product
        await this.blogService.findByIdAndDelete(id);

        return {
            message: "Blog has been deleted successfully."
        }

    }
}
