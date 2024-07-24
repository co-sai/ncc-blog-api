"use strict";
import { Controller, Get, Post, Patch, Param, Body, UploadedFiles, Request, UseGuards, UseInterceptors, InternalServerErrorException, Delete, Query, HttpCode, NotFoundException } from '@nestjs/common';
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

        // Extract blog IDs
        const blogIds = blogs.map(blog => blog._id);
        // Fetch media documents
        const medias = await this.blogService.findMediasByBlogIds(blogIds);

        // Map media documents to their corresponding blogs
        const blogData = blogs.map(blog => {
            const blogMedias = medias.filter(media => media.blog_id.toString() === blog._id.toString());
            return {
                ...blog.toObject(),
                medias: blogMedias.map(media => ({ _id: media._id, path: media.path }))
            };
        });

        return {
            data: blogData,
            total_count,
            limit,
            page
        };
    }

    @Public()
    @Get("/search")
    @HttpCode(200)
    @ApiOperation({ summary: "Blogs searching" })
    @ApiResponse({ status: 200, description: "Blogs list" })
    @ApiQuery({ name: 'q', required: false, description: 'Blog searching key' })
    @ApiQuery({ name: 'limit', required: false, description: 'Limit the number of results' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination' })
    async blogSearching(
        @Query() query: any,
    ) {
        const q = query.q ? query.q.trim() : '';
        const page = +query.page || 1;
        const limit = +query.limit || 20;

        // If q is empty, return empty arrays
        if (!q) {
            return {
                data: {
                    categories: [],
                    blogs: []
                }
            };
        }

        const sub_category = await this.categoryService.filterByName(q, page, limit);
        const { blogs, total_count } = await this.blogService.filterByName(q, page, limit);

        return {
            data: {
                // parent_category,
                sub_category,
                blogs,
                total_count,
                limit,
                page
            }
        }

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

            let medias_result: any;
            if (files.medias) {
                let media_files_names = [];

                for (const file of files.medias) {
                    const uniqueSuffix = Math.floor(100000 + Math.random() * 900000);
                    const newFilename = await this.fileService.generateFileName(`${blog._id}-${uniqueSuffix}-${file.originalname}`, file, 'uploads/blog');

                    media_files_names.push(`uploads/blog/${newFilename}`);
                }

                /** Start - Save blog's media */
                medias_result = await this.blogService.createMedias(media_files_names, blog._id);
                /** End - Save blog's media */
            }

            await blog.save();

            return {
                message: "Success",
                data: {
                    ...blog.toJSON(),
                    medias: medias_result
                }
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
            throw new NotFoundException("Blog data not found.");
        }

        blog.view = +blog.view + 1;
        await blog.save();

        const medias = await this.blogService.findMediasByBlogId(blog._id);

        return {
            data: {
                blog: {
                    ...blog.toJSON(),
                    medias
                }
            }
        };
    }

    /** We don't update main_media */
    @Post(":id")
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
                medias_to_remove: { type: "string", nullable: true, example: "[0,1]" },
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
        const { medias_to_remove } = body;
        let mediasFileName = [];
        const uploadFolder = path.join(process.cwd(), 'uploads', 'blog');

        if (files.medias && files.medias.length >= 1) {
            mediasFileName = files.medias.map((file: any) => path.join(uploadFolder, file.filename));
        }

        const blog = await this.blogService.findById(id);

        if (!blog) {
            await this.fileService.deleteFiles(mediasFileName);
            throw new InternalServerErrorException("Blog data not found.");
        }

        if (blog.category_id.toString() !== body.category_id.toString()) {
            const category = await this.categoryService.findSubCategoryById(body.category_id.toString());

            if (!category) {
                await this.fileService.deleteFiles(mediasFileName);
                throw new InternalServerErrorException("Category Not found.");
            }
        }

        const updatedBlog = await this.blogService.findByIdAndUpdate(id, body);

        /** Start - Remove medias from medias array */
        // Need to delete medias from uploads/blog folder
        if (medias_to_remove) {
            const mediaToRemoveArray = JSON.parse(medias_to_remove.replace(/'/g, '"'));
            const medias = await this.blogService.findMediasByMediasIds(mediaToRemoveArray);
            const mediasFilePath = medias.map((media) => path.join(process.cwd(), media.path));
            await this.fileService.deleteFiles(mediasFilePath);
            await this.blogService.findMediasByIdsAndDeleteMany(mediaToRemoveArray);
        }
        /** End - Remove medias from medias array */

        /**  Start - Process new medias (if any) */
        let medias_result: any;
        if (files.medias) {
            let media_files_names = [];

            for (const file of files.medias) {
                const uniqueSuffix = Math.floor(100000 + Math.random() * 900000);
                const newFilename = await this.fileService.generateFileName(`${id}-${uniqueSuffix}-${file.originalname}`, file, 'uploads/blog');
                media_files_names.push(`uploads/blog/${newFilename}`);
            }

            if (media_files_names.length > 0) {
                medias_result = await this.blogService.createMedias(media_files_names, id);
            }
        }
        /**  End - Process new medias (if any) */

        await updatedBlog.save();

        return {
            data: {
                ...updatedBlog.toObject(),
                medias: medias_result
            }
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

        const medias = await this.blogService.findMediasByBlogId(blog._id);

        return {
            message: "Rank updated successfully",
            data: {
                ...blog.toObject(),
                medias
            }
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

        const medias = await this.blogService.findMediasByBlogId(blog._id);
        if (medias.length > 0) {
            // Extract _id array
            const ids = medias.map(media => media._id);

            await this.blogService.findMediasByIdsAndDeleteMany(ids);

            const fileName: string[] = medias.map((media) => path.join(process.cwd(), media.path));
            await this.fileService.deleteFiles(fileName);
        }

        // delete product
        await this.blogService.findByIdAndDelete(id);

        return {
            message: "Blog has been deleted successfully."
        }

    }
}
