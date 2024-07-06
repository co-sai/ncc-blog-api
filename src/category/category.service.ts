import { Model } from 'mongoose';
import { Injectable, Body } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Category } from './schema/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoryService {
    constructor(
        @InjectModel(Category.name) private categoryModel: Model<Category>,
    ) { }

    async create(categoryDto: CreateCategoryDto): Promise<Category> {
        const createdCategory = new this.categoryModel(categoryDto);
        return await createdCategory.save();
    }

    async findParentCategory(): Promise<Category[]> {
        return await this.categoryModel.find({ parent_category_id: null }).exec();
    }

    async findAll(): Promise<any> {
        return this.getNestedCategories(null);
    }

    private async getNestedCategories(parentCategoryId: string | null): Promise<any> {
        const categories = await this.categoryModel
            .find({ parent_category_id: parentCategoryId }, '-createdAt -updatedAt -__v')
            .exec();
        const result = await Promise.all(categories.map(async (category) => {
            const subCategories = await this.getNestedCategories(category._id as string);
            return {
                ...category.toObject(),
                sub_categories: subCategories,
            };
        }));

        return result;
    }

    async findOne(id: string): Promise<Category> {
        return await this.categoryModel.findById(id).exec();
    }

    async update(id: string, categoryDto: Partial<CreateCategoryDto>): Promise<Category> {
        return await this.categoryModel.findByIdAndUpdate(id, categoryDto, { new: true }).exec();
    }

    async createSubcategory(body: CreateCategoryDto): Promise<Category> {
        const parentCategory = await this.categoryModel.findById(body.parent_category_id).exec();
        if (!parentCategory) {
            throw new Error('Parent category not found');
        }

        const newSubcategory = new this.categoryModel({
            ...body
        });
        return await newSubcategory.save();
    }

    async remove(id: string): Promise<Category> {
        // First, find all nested sub-categories and delete them recursively
        await this.deleteNestedCategories(id);
        // Then, delete the parent category
        return await this.categoryModel.findByIdAndDelete(id).exec();
    }

    private async deleteNestedCategories(parentCategoryId: string): Promise<void> {
        const subCategories = await this.categoryModel.find({ parent_category_id: parentCategoryId }).exec();

        for (const subCategory of subCategories) {
            // Recursively delete sub-categories of sub-categories
            await this.deleteNestedCategories(subCategory._id as string);
            // Delete the sub-category
            await this.categoryModel.findByIdAndDelete(subCategory._id).exec();
        }
    }
}

/** No need to implement 
    async findAll(): Promise<Category[]> {
        // const categories = await this.categoryModel.aggregate([
        //     {
        //         $match: {
        //             parent_category_id: null,
        //         },
        //     },
        //     {
        //         $lookup: {
        //             from: 'categories',
        //             localField: '_id',
        //             foreignField: 'parent_category_id',
        //             as: 'sub_categories',
        //         },
        //     },
        //     {
        //         $unwind: {
        //             path: '$sub_categories',
        //             preserveNullAndEmptyArrays: true,
        //         },
        //     },
        //     {
        //         $lookup: {
        //             from: 'categories',
        //             localField: 'sub_categories._id',
        //             foreignField: 'parent_category_id',
        //             as: 'sub_categories.sub_sub_categories',
        //         },
        //     },
        //     {
        //         $group: {
        //             _id: '$_id',
        //             name: { $first: '$name' },
        //             description: { $first: '$description' },
        //             createdAt: { $first: '$createdAt' },
        //             updatedAt: { $first: '$updatedAt' },
        //             sub_categories: { $push: '$sub_categories' },
        //         },
        //     },
        //     {
        //         $project: {
        //             _id: 1,
        //             name: 1,
        //             description: 1,
        //             createdAt: 1,
        //             updatedAt: 1,
        //             sub_categories: {
        //                 $filter: {
        //                     input: '$sub_categories',
        //                     as: 'sub_category',
        //                     cond: { $ne: ['$$sub_category', null] },
        //                 },
        //             },
        //         },
        //     },
        // ]).exec();

        // return categories;
        // return await this.categoryModel.find().exec();
        // const categories = await this.categoryModel.aggregate([
        //     {
        //         $match: {
        //             parent_category_id: null,
        //         },
        //     },
        //     {
        //         $lookup: {
        //             from: 'categories',
        //             localField: '_id',
        //             foreignField: 'parent_category_id',
        //             as: 'sub_categories',
        //         },
        //     },
        //     {
        //         $project: {
        //             _id: 1,
        //             name: 1,
        //             description: 1,
        //             createdAt: 1,
        //             updatedAt: 1,
        //             sub_categories: 1,
        //         },
        //     },
        // ]).exec();

        // return categories;
    }
*/