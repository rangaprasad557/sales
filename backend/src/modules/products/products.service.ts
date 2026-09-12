import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { eq, or, ilike, and, sql, desc, asc } from 'drizzle-orm';
import { db } from '../../db/connection';
import { products, inventoryLots, categories, Product, NewProduct } from '../../db/schema';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { SearchProductQueryDto, SemanticSearchDto } from './dto/search-product.dto';

export interface ProductWithStock extends Product {
  currentStock: number;
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
  lowestAvailableCost: string | null;
  categoryName?: string | null;
}

@Injectable()
export class ProductsService {
  async create(dto: CreateProductDto): Promise<Product> {
    if (!dto.name || dto.name.trim() === '') {
      throw new BadRequestException('Product name is required');
    }
    if (!dto.sku || dto.sku.trim() === '') {
      throw new BadRequestException('Product SKU is required');
    }

    const normalizedSku = dto.sku.trim().toUpperCase();
    const [existingSku] = await db.select().from(products).where(eq(products.sku, normalizedSku)).limit(1);
    if (existingSku) {
      throw new ConflictException(`Product with SKU '${normalizedSku}' already exists`);
    }

    if (dto.categoryId) {
      const [category] = await db.select().from(categories).where(eq(categories.id, dto.categoryId)).limit(1);
      if (!category) {
        throw new BadRequestException(`Category with ID ${dto.categoryId} does not exist`);
      }
    }

    const [created] = await db
      .insert(products)
      .values({
        sku: normalizedSku,
        name: dto.name.trim(),
        barcode: dto.barcode?.trim() || null,
        categoryId: dto.categoryId || null,
        unit: dto.unit?.trim() || 'pcs',
        minStockThreshold: dto.minStockThreshold !== undefined ? dto.minStockThreshold : 5,
        defaultSalePrice: dto.defaultSalePrice || '0.00',
        description: dto.description?.trim() || null,
        embedding: dto.embedding || null,
      })
      .returning();

    return created;
  }

  async findAll(query?: SearchProductQueryDto): Promise<ProductWithStock[]> {
    const productList = await db
      .select({
        product: products,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(products.name);

    // Fetch active inventory lots to compute stock levels
    const activeLots = await db
      .select({
        productId: inventoryLots.productId,
        remainingQty: inventoryLots.remainingQty,
        unitCost: inventoryLots.unitCost,
      })
      .from(inventoryLots)
      .where(eq(inventoryLots.status, 'ACTIVE'))
      .orderBy(inventoryLots.unitCost);

    const stockMap = new Map<number, { qty: number; lowestCost: string | null }>();
    for (const lot of activeLots) {
      const current = stockMap.get(lot.productId) || { qty: 0, lowestCost: null };
      current.qty += lot.remainingQty;
      if (current.lowestCost === null) {
        current.lowestCost = lot.unitCost;
      }
      stockMap.set(lot.productId, current);
    }

    let results: ProductWithStock[] = productList.map(({ product, categoryName }) => {
      const stockInfo = stockMap.get(product.id) || { qty: 0, lowestCost: null };
      const currentStock = stockInfo.qty;

      let stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
      if (currentStock === 0) {
        stockStatus = 'Out of Stock';
      } else if (currentStock <= product.minStockThreshold) {
        stockStatus = 'Low Stock';
      }

      return {
        ...product,
        categoryName: categoryName || null,
        currentStock,
        stockStatus,
        lowestAvailableCost: stockInfo.lowestCost,
      };
    });

    // Apply filtering if provided
    if (query?.query && query.query.trim() !== '') {
      const q = query.query.toLowerCase().trim();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.categoryName && p.categoryName.toLowerCase().includes(q)),
      );
    }

    if (query?.categoryId) {
      results = results.filter((p) => p.categoryId === Number(query.categoryId));
    }

    if (query?.lowStockOnly) {
      results = results.filter((p) => p.stockStatus === 'Low Stock' || p.stockStatus === 'Out of Stock');
    }

    return results;
  }

  async findById(id: number): Promise<ProductWithStock & { activeLots: any[] }> {
    const [found] = await db
      .select({
        product: products,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.id, id))
      .limit(1);

    if (!found) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const lots = await db
      .select()
      .from(inventoryLots)
      .where(and(eq(inventoryLots.productId, id), eq(inventoryLots.status, 'ACTIVE')))
      .orderBy(inventoryLots.unitCost);

    const currentStock = lots.reduce((sum, l) => sum + l.remainingQty, 0);
    let stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
    if (currentStock === 0) {
      stockStatus = 'Out of Stock';
    } else if (currentStock <= found.product.minStockThreshold) {
      stockStatus = 'Low Stock';
    }

    return {
      ...found.product,
      categoryName: found.categoryName || null,
      currentStock,
      stockStatus,
      lowestAvailableCost: lots.length > 0 ? lots[0].unitCost : null,
      activeLots: lots,
    };
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    const existing = await this.findById(id);

    if (dto.sku) {
      const normalizedSku = dto.sku.trim().toUpperCase();
      if (normalizedSku !== existing.sku) {
        const [skuConflict] = await db
          .select()
          .from(products)
          .where(eq(products.sku, normalizedSku))
          .limit(1);
        if (skuConflict) {
          throw new ConflictException(`Product with SKU '${normalizedSku}' already exists`);
        }
      }
    }

    if (dto.categoryId) {
      const [category] = await db.select().from(categories).where(eq(categories.id, dto.categoryId)).limit(1);
      if (!category) {
        throw new BadRequestException(`Category with ID ${dto.categoryId} does not exist`);
      }
    }

    const updateData: any = { updatedAt: new Date() };
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.sku !== undefined) updateData.sku = dto.sku.trim().toUpperCase();
    if (dto.barcode !== undefined) updateData.barcode = dto.barcode?.trim() || null;
    if (dto.categoryId !== undefined) updateData.categoryId = dto.categoryId || null;
    if (dto.unit !== undefined) updateData.unit = dto.unit.trim();
    if (dto.minStockThreshold !== undefined) updateData.minStockThreshold = dto.minStockThreshold;
    if (dto.defaultSalePrice !== undefined) updateData.defaultSalePrice = dto.defaultSalePrice;
    if (dto.description !== undefined) updateData.description = dto.description?.trim() || null;
    if (dto.embedding !== undefined) updateData.embedding = dto.embedding;

    const [updated] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();

    return updated;
  }

  async delete(id: number): Promise<{ message: string }> {
    await this.findById(id);
    await db.delete(products).where(eq(products.id, id));
    return { message: `Product with ID ${id} deleted successfully` };
  }

  async fuzzySearch(searchQuery: string): Promise<ProductWithStock[]> {
    return this.findAll({ query: searchQuery, fuzzy: true });
  }

  async semanticSearch(dto: SemanticSearchDto): Promise<ProductWithStock[]> {
    const limit = dto.limit || 10;
    const all = await this.findAll({ query: dto.queryText });
    return all.slice(0, limit);
  }
}
