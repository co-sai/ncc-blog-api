import { Model } from 'mongoose';
import { Injectable, Body } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Blog } from './schema/blog.schema';
import { CreateBlogDto } from './dto/create-blog.dto';

@Injectable()
export class BlogService {
    constructor(
        @InjectModel(Blog.name) private blogModel: Model<Blog>,
    ) { }

    async createBlog(body: CreateBlogDto, admin_id: string) {
        const blog = new this.blogModel({
            ...body, admin_id
        });
        return await blog.save();
    }

    async findByCategoryId(categoryId: string): Promise<Blog[]> {
        return this.blogModel.find({ category_id: categoryId }).exec();
    }

    /** Find Blog for category detail  using pagination */
    async findBlogsByCategoryId(id: string, page: number, limit: number
    ) {
        const blogs = await this.blogModel.find({ category_id: id })
            .limit(limit)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 })
            .exec();
        const total_count = await this.blogModel.find({ category_id: id }).countDocuments();

        return { blogs, total_count };
    }

    async deleteByCategoryId(categoryId: string): Promise<void> {
        await this.blogModel.deleteMany({ category_id: categoryId }).exec();
    }

    // Involved from Category Detail API
    async find(id: any) {
        return await this.blogModel.find({ category_id: id }).exec();
    }

    async findById(id: string): Promise<Blog> {
        return await this.blogModel.findById(id).exec();
    }

    async findByIdAndUpdate(id: string, body: any) {
        const blog = await this.blogModel.findByIdAndUpdate(id, body, { new: true }).exec();
        return blog;
    }

    async findByIdAndDelete(id: string) {
        await this.blogModel.findByIdAndDelete(id);
    }

    async filterAndSortBlogs(q: string, limit: number, page: number): Promise<{ blogs: Blog[], total_count: number }> {
        const sortOrder: { [key: string]: 1 | -1 } = q === 'rank' ? { rank: 1 } : { view: -1 };
        const skip = (page - 1) * limit;

        const blogs = await this.blogModel.find()
            .sort(sortOrder)
            .select("title content main_media view rank")
            .limit(limit)
            .skip(skip)
            .exec();

        const total_count = await this.blogModel.countDocuments().exec();

        return { blogs, total_count };
    }
}
