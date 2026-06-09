import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { InventoryService } from './inventory.service';
import { RequirePermissions } from '../rbac/permissions.decorator';

class CreateWarehouseDto {
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() type?: string;
}

class SetStockDto {
  @IsString() sku_id!: string;
  @IsString() warehouse_id!: string;
  @IsOptional() @IsInt() available?: number;
  @IsOptional() @IsInt() delta?: number;
  @IsOptional() @IsInt() low_watermark?: number;
}

@ApiTags('inventory')
@ApiBearerAuth()
@Controller({ path: 'admin/inventory', version: '1' })
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('warehouses')
  @RequirePermissions('inventory.read')
  warehouses() {
    return this.inventory.listWarehouses();
  }

  @Post('warehouses')
  @RequirePermissions('inventory.write')
  createWarehouse(@Body() dto: CreateWarehouseDto) {
    return this.inventory.createWarehouse(dto);
  }

  @Get()
  @RequirePermissions('inventory.read')
  list() {
    return this.inventory.listInventory();
  }

  @Post('set-stock')
  @RequirePermissions('inventory.write')
  setStock(@Body() dto: SetStockDto) {
    return this.inventory.setStock({
      skuId: BigInt(dto.sku_id),
      warehouseId: BigInt(dto.warehouse_id),
      available: dto.available,
      delta: dto.delta,
      lowWatermark: dto.low_watermark,
    });
  }
}
