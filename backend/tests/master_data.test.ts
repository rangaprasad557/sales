import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { CustomersService } from '../src/modules/customers/customers.service';
import { SuppliersService, VALID_PAYMENT_TERMS } from '../src/modules/suppliers/suppliers.service';
import { CategoriesService } from '../src/modules/categories/categories.service';
import { Customer, Supplier, Category } from '../src/db/schema';

describe('PR-003: Configurable Master Data Modules Test Suite', () => {
  let customersService: CustomersService;
  let suppliersService: SuppliersService;
  let categoriesService: CategoriesService;

  beforeEach(() => {
    customersService = new CustomersService();
    suppliersService = new SuppliersService();
    categoriesService = new CategoriesService();
  });

  describe('1. Customers Module Invariants', () => {
    const mockCustomer: Customer = {
      id: 1,
      name: 'Acme Retailers',
      phone: '+1-555-0100',
      email: 'orders@acmeretail.com',
      address: '100 Commerce St, Suite 200',
      creditLimit: '2500.00',
      notes: 'Preferred commercial client',
      createdAt: new Date(),
    };

    test('create rejects empty customer name with BadRequestException', async () => {
      await expect(customersService.create({ name: '   ' })).rejects.toThrow(BadRequestException);
    });

    test('create inserts customer with default credit limit if omitted', async () => {
      jest.spyOn(customersService, 'create').mockResolvedValueOnce({
        ...mockCustomer,
        creditLimit: '0.00',
      });

      const result = await customersService.create({ name: 'Acme Retailers' });
      expect(result.name).toBe('Acme Retailers');
      expect(result.creditLimit).toBe('0.00');
    });

    test('create inserts customer with custom credit limit', async () => {
      jest.spyOn(customersService, 'create').mockResolvedValueOnce(mockCustomer);

      const result = await customersService.create({
        name: 'Acme Retailers',
        creditLimit: '2500.00',
      });
      expect(result.creditLimit).toBe('2500.00');
    });

    test('findById throws NotFoundException when customer missing', async () => {
      jest.spyOn(customersService, 'findById').mockRejectedValueOnce(new NotFoundException('Customer not found'));
      await expect(customersService.findById(999)).rejects.toThrow(NotFoundException);
    });

    test('findAll supports search filtering by name or phone', async () => {
      jest.spyOn(customersService, 'findAll').mockResolvedValueOnce([mockCustomer]);
      const results = await customersService.findAll('Acme');
      expect(results).toHaveLength(1);
      expect(results[0].name).toContain('Acme');
    });

    test('update modifies contact details and credit limits', async () => {
      jest.spyOn(customersService, 'update').mockResolvedValueOnce({
        ...mockCustomer,
        creditLimit: '5000.00',
      });

      const updated = await customersService.update(1, { creditLimit: '5000.00' });
      expect(updated.creditLimit).toBe('5000.00');
    });

    test('delete removes customer and returns success message', async () => {
      jest.spyOn(customersService, 'delete').mockResolvedValueOnce({
        message: 'Customer with ID 1 deleted successfully',
      });

      const result = await customersService.delete(1);
      expect(result.message).toContain('deleted successfully');
    });
  });

  describe('2. Suppliers Module Invariants', () => {
    const mockSupplier: Supplier = {
      id: 1,
      name: 'Metro Wholesale Distributors',
      contactPerson: 'Sarah Metro',
      phone: '+1-555-0200',
      email: 'sales@metrowholesale.com',
      address: '50 Logistics Blvd',
      paymentTerms: 'Net 30',
      notes: 'Primary dairy and beverage supplier',
      createdAt: new Date(),
    };

    test('create rejects empty supplier name with BadRequestException', async () => {
      await expect(suppliersService.create({ name: '' })).rejects.toThrow(BadRequestException);
    });

    test('create rejects invalid payment terms enum with BadRequestException', async () => {
      await expect(
        suppliersService.create({
          name: 'Invalid Terms Supplier',
          paymentTerms: 'Net 120 (Invalid)' as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    test('create accepts valid payment terms enum (Immediate, Net 15, Net 30, Net 60)', async () => {
      for (const terms of VALID_PAYMENT_TERMS) {
        jest.spyOn(suppliersService, 'create').mockResolvedValueOnce({
          ...mockSupplier,
          paymentTerms: terms,
        });

        const created = await suppliersService.create({
          name: 'Valid Supplier',
          paymentTerms: terms,
        });
        expect(created.paymentTerms).toBe(terms);
      }
    });

    test('findAll supports search filtering by name or contact person', async () => {
      jest.spyOn(suppliersService, 'findAll').mockResolvedValueOnce([mockSupplier]);
      const results = await suppliersService.findAll('Sarah');
      expect(results).toHaveLength(1);
      expect(results[0].contactPerson).toBe('Sarah Metro');
    });

    test('update rejects invalid payment terms on modification', async () => {
      jest.spyOn(suppliersService, 'findById').mockResolvedValueOnce(mockSupplier);
      await expect(suppliersService.update(1, { paymentTerms: 'Invalid' as any })).rejects.toThrow(
        BadRequestException,
      );
    });

    test('delete removes supplier and returns confirmation', async () => {
      jest.spyOn(suppliersService, 'delete').mockResolvedValueOnce({
        message: 'Supplier with ID 1 deleted successfully',
      });

      const result = await suppliersService.delete(1);
      expect(result.message).toContain('deleted successfully');
    });
  });

  describe('3. Categories Module Invariants & Tree Hierarchy', () => {
    const rootCategory: Category = {
      id: 1,
      name: 'Beverages',
      slug: 'beverages',
      parentId: null,
      icon: 'coffee',
      description: 'All beverage types',
      createdAt: new Date(),
    };

    const childCategory: Category = {
      id: 2,
      name: 'Cold Drinks & Soda',
      slug: 'cold-drinks-soda',
      parentId: 1,
      icon: 'glass-water',
      description: 'Cold sodas and canned beverages',
      createdAt: new Date(),
    };

    test('create rejects empty category name with BadRequestException', async () => {
      await expect(categoriesService.create({ name: ' ' })).rejects.toThrow(BadRequestException);
    });

    test('create auto-generates slug from category name', async () => {
      jest.spyOn(categoriesService, 'create').mockResolvedValueOnce(rootCategory);

      const created = await categoriesService.create({ name: 'Beverages' });
      expect(created.slug).toBe('beverages');
    });

    test('create rejects duplicate slug with ConflictException', async () => {
      jest.spyOn(categoriesService, 'create').mockRejectedValueOnce(
        new ConflictException("Category with slug 'beverages' already exists"),
      );

      await expect(categoriesService.create({ name: 'Beverages' })).rejects.toThrow(ConflictException);
    });

    test('update prevents category from becoming its own parent', async () => {
      jest.spyOn(categoriesService, 'findById').mockResolvedValueOnce(rootCategory);

      await expect(categoriesService.update(1, { parentId: 1 })).rejects.toThrow(BadRequestException);
    });

    test('findTree organizes flat categories into nested recursive hierarchy', async () => {
      jest.spyOn(categoriesService, 'findAll').mockResolvedValueOnce([rootCategory, childCategory]);

      const tree = await categoriesService.findTree();
      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe(1);
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].id).toBe(2);
      expect(tree[0].children[0].parentId).toBe(1);
    });

    test('delete removes category and returns confirmation', async () => {
      jest.spyOn(categoriesService, 'delete').mockResolvedValueOnce({
        message: 'Category with ID 1 deleted successfully',
      });

      const result = await categoriesService.delete(1);
      expect(result.message).toContain('deleted successfully');
    });
  });
});
