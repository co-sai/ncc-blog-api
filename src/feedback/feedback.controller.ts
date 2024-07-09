import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags("Feedback API")
@UseGuards(JwtAuthGuard)
@Controller({ path: "feedback", version: "1" })
export class FeedbackController {
    constructor(
        private readonly feedbackService: FeedbackService
    ) { }

    @Get()
    @HttpCode(200)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Feedback list" })
    @ApiResponse({ status: 200, description: "Feedback list" })
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
    @HttpCode(201)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Success" })
    @ApiResponse({ status: 201, description: "Add feedback" })
    @ApiBody({ type: CreateFeedbackDto })
    async addFeedback(
        @Body() body: CreateFeedbackDto
    ) {
        const feedback = await this.feedbackService.create(body);

        return {
            message: "Success",
            data: feedback
        }
    }

    @Delete(":id")
    @HttpCode(200)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Delete feedback" })
    @ApiResponse({ status: 200, description: "Feedback has been deleted successful." })
    async deleteFeedback(
        @Param("id") id: string
    ) {
        const feedback = await this.feedbackService.findByIdAndDelete(id);

        return {
            message: "Feedback has been deleted successful."
        }
    }
}
