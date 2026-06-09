import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersAdminController } from './orders.controller';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [OrdersAdminController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
