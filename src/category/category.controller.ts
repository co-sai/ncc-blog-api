import { Body, Controller, Delete, Get, HttpCode, InternalServerErrorException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { CategoryService } from './category.service';
import { FileService } from 'src/common/file/file.service';
import { BlogService } from 'src/blog/blog.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Category } from './schema/category.schema';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/decorators/public.decorators';

@ApiTags("Category API")
@UseGuards(JwtAuthGuard)
@Controller({ path: "category", version: "1" })
export class CategoryController {
    constructor(
        private readonly categoryService: CategoryService,
        private readonly fileService: FileService,
        private readonly blogService: BlogService
    ) { }

    @Post("add")
    @HttpCode(201)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Create category." })
    @ApiResponse({ status: 201, description: "Category has been created successfully." })
    @ApiBody({ type: CreateCategoryDto })
    async createParentCategory(@Body() createCategoryDto: CreateCategoryDto) {
        const category = await this.categoryService.create(createCategoryDto);
        return {
            data: category
        }
    }

    /** Category List */
    @Public()
    @Get()
    @HttpCode(200)
    @ApiOperation({ summary: "Category List including sub-category for learning page."})
    async findAll() {
        const result = await this.categoryService.findAll();
        return {
            data: result
        }
    }

    @Get("parent")
    @HttpCode(200)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Parent category list for create sub-category."})
    async findParentCategory() {
        const result = await this.categoryService.findParentCategory();
        return {
            data: result
        }
    }

    @Get("sub-category")
    @HttpCode(200)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary:  "Sub-category list for create blog."})
    async findSubCategory() {
        const result = await this.categoryService.findAllSubCategory();
        return {
            data: result
        }
    }

    @Post('/sub-category')
    @HttpCode(201)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Create sub-category." })
    @ApiResponse({ status: 201, description: "Sub-Category has been created successfully." })
    @ApiBody({
        description: 'Create sub-category',
        required: true,
        examples: {
            example1: {
                summary: 'Create sub-category example',
                value: {
                    name: 'sub-category from swagger',
                    description: 'Testing create sub-category in swagger',
                    parent_category_id: "id"
                }
            }
        }
    })
    async createSubcategory(@Body() body: CreateCategoryDto) {
        const result = await this.categoryService.createSubcategory(body);
        return {
            data: result
        }
    }

    /** Done - Need to implement - Category Detail - find category / related sub-category and related blogs. */
    @Public()
    @Get(':id')
    @HttpCode(200)
    @ApiOperation({ summary : "List of Category / Sub-category and related product."})
    @ApiResponse({ status : 200, description : "List of Category / Sub-category and related products."})
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

    @Patch(':id')
    @HttpCode(200)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Update sub-category." })
    @ApiResponse({ status: 200, description: "Success." })
    @ApiBody({
        description: 'update',
        required: true,
        examples: {
            example1: {
                summary: 'update example',
                value: {
                    name: 'sub-category from swagger',
                    description: 'Testing update in swagger',
                    parent_category_id: "id"
                }
            }
        }
    })
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
    @Delete(':id')
    @HttpCode(200)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Delete Category / Sub-Category and related blogs." })
    @ApiResponse({ status: 200, description: "Success." })
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
