import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';

import { Category, CategorySchema } from './schema/category.schema';
import { BlogModule } from 'src/blog/blog.module';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
    ]),
    forwardRef(()=> BlogModule),
    CommonModule
  ],
  controllers: [CategoryController],
  providers: [CategoryService],
  exports : [CategoryService]
})
export class CategoryModule {}
