import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async getValuation() {
    const data = await this.inventoryService.getStoreValuation();
    return {
      status: 'success',
      data,
    };
  }

  @Get('lots')
  async getLots(
    @Query('product_id') productIdStr?: string,
    @Query('active_only') activeOnlyStr?: string,
  ) {
    if (productIdStr) {
      const productId = parseInt(productIdStr, 10);
      if (isNaN(productId)) {
        throw new BadRequestException('product_id must be a valid integer');
      }
      const activeOnly = activeOnlyStr !== 'false';
      const lots = await this.inventoryService.getLotsForProduct(productId, activeOnly);
      return {
        status: 'success',
        count: lots.length,
        data: lots,
      };
    }

    const lots = await this.inventoryService.getAllActiveLots();
    return {
      status: 'success',
      count: lots.length,
      data: lots,
    };
  }
}
