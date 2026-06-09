import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsAdminController, ProductsPublicController } from './products.controller';

@Module({
  controllers: [ProductsPublicController, ProductsAdminController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
