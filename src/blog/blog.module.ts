import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';

import { CommonModule } from 'src/common/common.module';

import { Blog, BlogSchema } from './schema/blog.schema';
import { MulterModule } from '@nestjs/platform-express';
import { blogMulterConfig } from './blog.multer.config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Blog.name, schema: BlogSchema },
    ]),
    MulterModule.register(blogMulterConfig),
    CommonModule
  ],
  controllers: [BlogController],
  providers: [BlogService]
})
export class BlogModule {}
