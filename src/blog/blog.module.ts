import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';

import { CommonModule } from 'src/common/common.module';

import { Blog, BlogSchema } from './schema/blog.schema';
import { MulterModule } from '@nestjs/platform-express';
import { blogMulterConfig } from './blog.multer.config';
import { CategoryModule } from 'src/category/category.module';
import { AdminModule } from 'src/admin/admin.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Blog.name, schema: BlogSchema },
    ]),
    MulterModule.register(blogMulterConfig),
    CommonModule,
    forwardRef(()=> CategoryModule),
    AdminModule
  ],
  controllers: [BlogController],
  providers: [BlogService],
  exports: [BlogService]
})
export class BlogModule { }
