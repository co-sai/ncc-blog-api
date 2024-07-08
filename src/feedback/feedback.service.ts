import { Model } from 'mongoose';
import { Injectable, Body } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Feedback } from './schema/feedback.schema';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
    constructor(
        @InjectModel(Feedback.name) private feedbackModel: Model<Feedback>,
    ) { }

    async create(body: CreateFeedbackDto) {
        const feedback = new this.feedbackModel({ ...body });
        return await feedback.save();
    }

    async findAllFeedback(page: number, limit: number) {
        const feedbacks = await this.feedbackModel.find()
            .limit(limit)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 })
            .exec();
        const total_count = await this.feedbackModel.find().countDocuments();

        return { feedbacks, total_count };
    }

    async findByIdAndDelete(id : string){
        return await this.feedbackModel.findByIdAndDelete(id);
    }

    async findFeedbacksByBlogId(id: string, page: number, limit : number){
        const feedbacks = await this.feedbackModel.find({ blog_id : id })
            .limit(limit)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 })
            .exec();
        const total_count = await this.feedbackModel.find().countDocuments();

        return { feedbacks, total_count };
    }
}
