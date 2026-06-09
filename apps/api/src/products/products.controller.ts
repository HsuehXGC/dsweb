import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { Public } from '../auth/public.decorator';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { CreateProductDto, CreateSkuDto, UpdateProductDto } from './dto/products.dto';

@ApiTags('products-public')
@Controller({ path: 'public/products', version: '1' })
export class ProductsPublicController {
  constructor(private readonly products: ProductsService) {}

  @Public()
  @Get()
  list() {
    return this.products.listPublic();
  }

  @Public()
  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.products.getPublicBySlug(slug);
  }
}

@ApiTags('products-admin')
@ApiBearerAuth()
@Controller({ path: 'admin/products', version: '1' })
export class ProductsAdminController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @RequirePermissions('products.read')
  list(@Query('q') q?: string, @Query('type') type?: string) {
    return this.products.list({ q, type });
  }

  @Get(':id')
  @RequirePermissions('products.read')
  get(@Param('id') id: string) {
    return this.products.get(BigInt(id));
  }

  @Post()
  @RequirePermissions('products.write')
  create(@Body() dto: CreateProductDto) {
    return this.products.create({
      slug: dto.slug,
      name: dto.name,
      type: dto.type,
      basePrice: dto.base_price,
      description: dto.description,
      specs: dto.specs,
    });
  }

  @Patch(':id')
  @RequirePermissions('products.write')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(BigInt(id), {
      name: dto.name,
      basePrice: dto.base_price,
      isActive: dto.is_active,
      description: dto.description,
    });
  }

  @Post(':id/skus')
  @RequirePermissions('products.write')
  createSku(@Param('id') id: string, @Body() dto: CreateSkuDto) {
    return this.products.createSku(BigInt(id), {
      code: dto.code,
      price: dto.price,
      variant: dto.variant,
    });
  }
}
