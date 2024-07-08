import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@Controller({ path: "feedback", version: "1" })
export class FeedbackController {
    constructor(
        private readonly feedbackService: FeedbackService
    ) { }

    @UseGuards(JwtAuthGuard)
    @Get()
    async feedbackList(
        @Query() query: { page: string, limit: string }
    ) {
        const page = +query.page || 1;
        const limit = +query.limit || 20;

        const { feedbacks, total_count } = await this.feedbackService.findAllFeedback(page, limit);

        return {
            data: {
                feedbacks,
                page,
                limit,
                total_count
            }
        }
    }

    @Post('add')
    async addFeedback(
        @Body() body: CreateFeedbackDto
    ) {
        const feedback = await this.feedbackService.create(body);

        return {
            message: "Success",
            data: feedback
        }
    }

    @UseGuards(JwtAuthGuard)
    @Delete(":id")
    async deleteFeedback(
        @Param("id") id: string
    ) {
        const feedback = await this.feedbackService.findByIdAndDelete(id);

        return {
            message : "Feedback has been deleted successful."
        }
    }
}
