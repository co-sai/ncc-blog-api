import { Body, Controller, Delete, Get, HttpCode, InternalServerErrorException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { CategoryService } from './category.service';
import { FileService } from 'src/common/file/file.service';
import { BlogService } from 'src/blog/blog.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Category } from './schema/category.schema';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller({ path: "category", version: "1" })
export class CategoryController {
    constructor(
        private readonly categoryService: CategoryService,
        private readonly fileService: FileService,
        private readonly blogService: BlogService
    ) { }

    @HttpCode(201)
    @Post("add")
    async createParentCategory(@Body() createCategoryDto: CreateCategoryDto) {
        const category = await this.categoryService.create(createCategoryDto);
        return {
            data: category
        }
    }

    /** Category List */
    @HttpCode(200)
    @Get()
    async findAll() {
        const result = await this.categoryService.findAll();
        return {
            data: result
        }
    }

    @HttpCode(200)
    @Get("parent")
    async findParentCategory() {
        const result = await this.categoryService.findParentCategory();
        return {
            data: result
        }
    }

    @HttpCode(200)
    @Get("sub-category")
    async findSubCategory() {
        const result = await this.categoryService.findAllSubCategory();
        return {
            data: result
        }
    }

    @Post('/sub-category')
    async createSubcategory(@Body() body: CreateCategoryDto) {
        const result = await this.categoryService.createSubcategory(body);
        return {
            data: result
        }
    }

    /** Need to implement - Category Detail - find category / related sub-category and related blogs. */
    @HttpCode(200)
    @Get(':id')
    async findOne(
        @Param('id') id: string,
        @Query() query : { page : string, limit : string}
    ) {
        const page = +query.page || 1;
        const limit = +query.limit || 20;

        const category = await this.categoryService.findOne(id);
        const { blogs, total_count } = await this.blogService.findBlogsByCategoryId(id, page, limit);

        return {
            data: {
                category,
                blogs,
                page,
                limit,
                total_count
            }
        }
    }

    @HttpCode(200)
    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateCategoryDto: Partial<CreateCategoryDto>) {
        const result = await this.categoryService.update(id, updateCategoryDto);
        return {
            data: result
        }
    }

    /** In-progress - Need to implement Delete related product */
    /** In-progress - Need to implement Delete related product images */
    // @HttpCode(200)
    // @Delete(':id')
    // async remove(@Param('id') id: string) {
    //     // Fetch all blogs related to the category
    //     const blogs = await this.blogService.findByCategoryId(id);
    //     if (blogs.length > 0) {
    //         // Delete media files associated with each blog
    //         for (const blog of blogs) {
    //             if (blog.medias && blog.medias.length > 0) {
    //                 await this.fileService.deleteFiles(blog.medias);
    //             }
    //         }
    //         // Delete blogs related to the category
    //         await this.blogService.deleteByCategoryId(id);
    //     }
    //     // Delete the category
    //     await this.categoryService.remove(id);
    //     return {
    //         message: "Category and related blogs have been deleted successfully."
    //     }
    // }
    @HttpCode(200)
    @Delete(':id')
    async remove(@Param('id') id: string) {
        // Recursive function to delete category and its related sub-categories and blogs
        const deleteCategoryAndRelated = async (categoryId: string) => {
            // Fetch all sub-categories related to the category
            const subCategories = await this.categoryService.findSubCategories(categoryId);
            for (const subCategory of subCategories) {
                // Recursively delete sub-category and its related sub-categories and blogs
                await deleteCategoryAndRelated(subCategory._id as string);
            }

            // Fetch all blogs related to the category
            const blogs = await this.blogService.findByCategoryId(categoryId);
            if (blogs.length > 0) {
                // Delete media files associated with each blog
                for (const blog of blogs) {
                    if (blog.medias && blog.medias.length > 0) {
                        await this.fileService.deleteFiles(blog.medias);
                    }
                }
                // Delete blogs related to the category
                await this.blogService.deleteByCategoryId(categoryId);
            }
            // Delete the category
            await this.categoryService.remove(categoryId);
        };

        // Start the deletion process for the main category
        await deleteCategoryAndRelated(id);

        return {
            message: "Category and related sub-categories and blogs have been deleted successfully."
        };
    }
}
