import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  listWarehouses() {
    return this.prisma.warehouse.findMany({ orderBy: { id: 'asc' } });
  }

  createWarehouse(data: { code: string; name: string; type?: string }) {
    return this.prisma.warehouse.create({
      data: { code: data.code, name: data.name, type: data.type ?? 'main' },
    });
  }

  /** 库存视图：按 SKU×仓库，含可用/已分配/在途/低位预警 */
  listInventory() {
    return this.prisma.inventory.findMany({
      orderBy: { id: 'asc' },
      include: {
        sku: { include: { product: { select: { name: true, slug: true } } } },
        warehouse: { select: { code: true, name: true } },
      },
    });
  }

  /** 设置/调整某 SKU 在某仓库的可用库存（绝对值或增量） */
  async setStock(data: {
    skuId: bigint;
    warehouseId: bigint;
    available?: number;
    delta?: number;
    lowWatermark?: number;
  }) {
    const existing = await this.prisma.inventory.findUnique({
      where: { skuId_warehouseId: { skuId: data.skuId, warehouseId: data.warehouseId } },
    });
    const nextAvailable =
      data.available !== undefined
        ? data.available
        : (existing?.available ?? 0) + (data.delta ?? 0);

    return this.prisma.inventory.upsert({
      where: { skuId_warehouseId: { skuId: data.skuId, warehouseId: data.warehouseId } },
      update: { available: nextAvailable, lowWatermark: data.lowWatermark },
      create: {
        skuId: data.skuId,
        warehouseId: data.warehouseId,
        available: nextAvailable,
        lowWatermark: data.lowWatermark ?? 0,
      },
    });
  }

  /** 为订单扣减库存（从默认主仓 available 扣，记录到 allocated）。库存不足抛错。 */
  async deductForItems(
    tx: Prisma.TransactionClient,
    items: Array<{ skuId: bigint; quantity: number }>,
    warehouseId: bigint,
  ) {
    for (const item of items) {
      const inv = await tx.inventory.findUnique({
        where: { skuId_warehouseId: { skuId: item.skuId, warehouseId } },
      });
      if (!inv || inv.available < item.quantity) {
        throw new NotFoundException(
          `Insufficient stock for SKU ${item.skuId} (need ${item.quantity})`,
        );
      }
      await tx.inventory.update({
        where: { id: inv.id },
        data: {
          available: inv.available - item.quantity,
          allocated: inv.allocated + item.quantity,
        },
      });
    }
  }

  /** 返回主仓（type=main 的第一个），供结账扣库存用 */
  async mainWarehouse() {
    const w = await this.prisma.warehouse.findFirst({ where: { type: 'main' }, orderBy: { id: 'asc' } });
    if (!w) throw new NotFoundException('No main warehouse configured');
    return w;
  }
}
