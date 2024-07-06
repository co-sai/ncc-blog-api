import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Category } from './schema/category.schema';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller({ path: "category", version: "1" })
export class CategoryController {
    constructor(
        private readonly categoryService: CategoryService
    ) { }

    @HttpCode(201)
    @Post("add")
    async createParentCategory(@Body() createCategoryDto: CreateCategoryDto) {
        const category = await this.categoryService.create(createCategoryDto);
        return {
            data : category
        }
    }

    @HttpCode(200)
    @Get()
    async findAll() {
        const result = await this.categoryService.findAll();
        return {
            data : result
        }
    }

    @HttpCode(200)
    @Get("parent")
    async findParentCategory(){
        const result = await this.categoryService.findParentCategory();
        return {
            data : result
        }
    }

    @Post('/sub-category')
    async createSubcategory(@Body() body: CreateCategoryDto) {
        const result = await this.categoryService.createSubcategory(body);
        return {
            data : result
        }
    }

    @HttpCode(200)
    @Get(':id')
    async findOne(@Param('id') id: string) {
        const result = await this.categoryService.findOne(id);
        return {
            data : result
        }
    }

    @HttpCode(200)
    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateCategoryDto: Partial<CreateCategoryDto>) {
        const result = await this.categoryService.update(id, updateCategoryDto);
        return {
            data : result
        }
    }

    /** In-progress - Need to implement Delete related product */
    /** In-progress - Need to implement Delete related product images */
    @HttpCode(200)
    @Delete(':id')
    async remove(@Param('id') id: string) {
        await this.categoryService.remove(id);
        return {
            message : "Category has been deleted successful."
        }
    }
}
