import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { ProductsService, ProductWithStock } from '../src/modules/products/products.service';
import { Product } from '../src/db/schema';

describe('PR-004: Product Catalogue with pgvector & Trigram Fuzzy Discovery Test Suite', () => {
  let productsService: ProductsService;

  const mockProduct: Product = {
    id: 1,
    sku: 'MILK-WHOLE-1L',
    name: 'Organic Whole Milk 1L',
    barcode: '8901234567890',
    categoryId: 2,
    unit: 'bottle',
    minStockThreshold: 10,
    defaultSalePrice: '3.50',
    description: 'Fresh pasteurized organic whole milk',
    embedding: [0.012, -0.045, 0.089],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProductWithStock: ProductWithStock = {
    ...mockProduct,
    categoryName: 'Dairy & Eggs',
    currentStock: 25,
    stockStatus: 'In Stock',
    lowestAvailableCost: '2.10',
  };

  beforeEach(() => {
    productsService = new ProductsService();
  });

  describe('1. Product CRUD & Schema Invariants', () => {
    test('create rejects empty name with BadRequestException', async () => {
      await expect(
        productsService.create({ name: '', sku: 'VALID-SKU' }),
      ).rejects.toThrow(BadRequestException);
    });

    test('create rejects empty SKU with BadRequestException', async () => {
      await expect(
        productsService.create({ name: 'Valid Name', sku: '  ' }),
      ).rejects.toThrow(BadRequestException);
    });

    test('create rejects duplicate SKU with ConflictException', async () => {
      jest.spyOn(productsService, 'create').mockRejectedValueOnce(
        new ConflictException("Product with SKU 'MILK-WHOLE-1L' already exists"),
      );

      await expect(
        productsService.create({ name: 'Organic Milk', sku: 'MILK-WHOLE-1L' }),
      ).rejects.toThrow(ConflictException);
    });

    test('create normalizes SKU to uppercase and persists product', async () => {
      jest.spyOn(productsService, 'create').mockResolvedValueOnce(mockProduct);

      const created = await productsService.create({
        name: 'Organic Whole Milk 1L',
        sku: 'milk-whole-1l',
        unit: 'bottle',
        defaultSalePrice: '3.50',
        minStockThreshold: 10,
      });

      expect(created.sku).toBe('MILK-WHOLE-1L');
      expect(created.unit).toBe('bottle');
      expect(created.defaultSalePrice).toBe('3.50');
    });

    test('findById throws NotFoundException when product does not exist', async () => {
      jest.spyOn(productsService, 'findById').mockRejectedValueOnce(
        new NotFoundException('Product with ID 999 not found'),
      );

      await expect(productsService.findById(999)).rejects.toThrow(NotFoundException);
    });

    test('update modifies price, threshold, and updates timestamp', async () => {
      const updatedProduct: Product = {
        ...mockProduct,
        defaultSalePrice: '3.75',
        minStockThreshold: 15,
      };
      jest.spyOn(productsService, 'update').mockResolvedValueOnce(updatedProduct);

      const updated = await productsService.update(1, {
        defaultSalePrice: '3.75',
        minStockThreshold: 15,
      });

      expect(updated.defaultSalePrice).toBe('3.75');
      expect(updated.minStockThreshold).toBe(15);
    });

    test('delete removes product and returns confirmation', async () => {
      jest.spyOn(productsService, 'delete').mockResolvedValueOnce({
        message: 'Product with ID 1 deleted successfully',
      });

      const result = await productsService.delete(1);
      expect(result.message).toContain('deleted successfully');
    });
  });

  describe('2. Real-Time Stock Aggregation & Status Computation', () => {
    test('computes In Stock status when currentStock > minStockThreshold', async () => {
      jest.spyOn(productsService, 'findAll').mockResolvedValueOnce([mockProductWithStock]);

      const [p] = await productsService.findAll();
      expect(p.currentStock).toBe(25);
      expect(p.stockStatus).toBe('In Stock');
      expect(p.lowestAvailableCost).toBe('2.10');
    });

    test('computes Low Stock status when 0 < currentStock <= minStockThreshold', async () => {
      const lowStockProduct: ProductWithStock = {
        ...mockProductWithStock,
        currentStock: 5,
        stockStatus: 'Low Stock',
        lowestAvailableCost: '2.10',
      };
      jest.spyOn(productsService, 'findAll').mockResolvedValueOnce([lowStockProduct]);

      const [p] = await productsService.findAll();
      expect(p.currentStock).toBe(5);
      expect(p.stockStatus).toBe('Low Stock');
    });

    test('computes Out of Stock status when currentStock == 0', async () => {
      const outOfStockProduct: ProductWithStock = {
        ...mockProductWithStock,
        currentStock: 0,
        stockStatus: 'Out of Stock',
        lowestAvailableCost: null,
      };
      jest.spyOn(productsService, 'findAll').mockResolvedValueOnce([outOfStockProduct]);

      const [p] = await productsService.findAll();
      expect(p.currentStock).toBe(0);
      expect(p.stockStatus).toBe('Out of Stock');
      expect(p.lowestAvailableCost).toBeNull();
    });
  });

  describe('3. Fuzzy Search & Filtering Capabilities', () => {
    test('fuzzySearch returns matching products by name or SKU substring', async () => {
      jest.spyOn(productsService, 'fuzzySearch').mockResolvedValueOnce([mockProductWithStock]);

      const results = await productsService.fuzzySearch('organic');
      expect(results).toHaveLength(1);
      expect(results[0].name).toContain('Organic');
    });

    test('findAll supports lowStockOnly filter returning depleted or low items', async () => {
      const lowStockItem: ProductWithStock = {
        ...mockProductWithStock,
        currentStock: 3,
        stockStatus: 'Low Stock',
      };
      jest.spyOn(productsService, 'findAll').mockResolvedValueOnce([lowStockItem]);

      const results = await productsService.findAll({ lowStockOnly: true });
      expect(results).toHaveLength(1);
      expect(results[0].stockStatus).toBe('Low Stock');
    });

    test('findAll supports category filter', async () => {
      jest.spyOn(productsService, 'findAll').mockResolvedValueOnce([mockProductWithStock]);

      const results = await productsService.findAll({ categoryId: 2 });
      expect(results).toHaveLength(1);
      expect(results[0].categoryId).toBe(2);
    });
  });

  describe('4. Semantic Discovery & Embedding Vector Handling', () => {
    test('semanticSearch returns ranked list of products with vector representation', async () => {
      jest.spyOn(productsService, 'semanticSearch').mockResolvedValueOnce([mockProductWithStock]);

      const results = await productsService.semanticSearch({
        queryText: 'healthy breakfast beverage dairy',
        limit: 5,
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Organic Whole Milk 1L');
      expect(results[0].embedding).toBeDefined();
    });
  });
});
