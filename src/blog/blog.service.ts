import { Model, Models } from 'mongoose';
import { Injectable, Body } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Blog } from './schema/blog.schema';
import { Media } from './schema/media.schema';
import { CreateBlogDto } from './dto/create-blog.dto';

@Injectable()
export class BlogService {
    constructor(
        @InjectModel(Blog.name) private blogModel: Model<Blog>,
        @InjectModel(Media.name) private mediaModel: Model<Media>
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

    async findMediasByBlogId(blog_id: any) {
        return await this.mediaModel.find({ blog_id: blog_id }).select("_id path").exec();
    }

    async findMediasByBlogIds(blogIds: any) {
        return this.mediaModel.find({ blog_id: { $in: blogIds } }).exec();
    }

    async findMediasByIdsAndDeleteMany(ids : any){
        return this.mediaModel.deleteMany({ _id: { $in: ids } }).exec();
    }

    async findMediasByMediasIds(ids : any){
        return this.mediaModel.find({ _id: { $in: ids } }).exec();
    }

    async findByIdAndUpdate(id: string, body: any) {
        const blog = await this.blogModel.findByIdAndUpdate(id, body, { new: true }).exec();
        return blog;
    }

    async findByIdAndDelete(id: string) {
        await this.blogModel.findByIdAndDelete(id);
    }

    async filterAndSortBlogs(q: string, limit: number, page: number, random: Boolean): Promise<{ blogs: Blog[], total_count: number }> {

        let blogs: Blog[];
        const skip = (page - 1) * limit;
        const total_count = await this.blogModel.countDocuments().exec();

        if (random) {
            const randomIndices = new Set<number>();

            while (randomIndices.size < Math.min(limit, total_count)) {
                randomIndices.add(Math.floor(Math.random() * total_count));
            }

            const blogPromises = Array.from(randomIndices).map(skip =>
                this.blogModel.findOne().skip(skip).select("title content main_media view rank").exec()
            );

            blogs = await Promise.all(blogPromises);
        } else {
            const sortOrder: { [key: string]: 1 | -1 } = q === 'rank' ? { rank: 1 } : { view: -1 };
            blogs = await this.blogModel.find()
                .sort(sortOrder)
                .select("title content main_media view rank")
                .limit(limit)
                .skip(skip)
                .exec();
        }

        return { blogs, total_count };
    }

    async filterByName(q: string, page: number, limit: number): Promise<{ blogs: Blog[], total_count: number }> {
        const searchTerm = q.trim();
        if (!searchTerm) {
            return { blogs: [], total_count: 0 };
        }
        const blogs = await this.blogModel.find({
            title: { $regex: new RegExp(searchTerm, 'i') }
        })
            .select("_id title")
            .skip((page - 1) * limit)
            .limit(limit)
            .exec();

        const total_count = await this.blogModel.find({
            title: { $regex: new RegExp(searchTerm, 'i') }
        }).countDocuments();

        return { blogs, total_count };
    }

    async createMedias(media_files_names: string[], blog_id: any) {
        const mediaDocs = media_files_names.map(path => ({ path, blog_id }));
        const medias = await this.mediaModel.insertMany(mediaDocs);
        return medias.map(media => ({ _id: media._id, path: media.path }));
    }
}
