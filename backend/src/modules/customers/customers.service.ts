import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, ilike, or } from 'drizzle-orm';
import { db } from '../../db/connection';
import { customers, Customer, NewCustomer } from '../../db/schema';

@Injectable()
export class CustomersService {
  async create(data: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    creditLimit?: string;
    notes?: string;
  }): Promise<Customer> {
    if (!data.name || data.name.trim() === '') {
      throw new BadRequestException('Customer name is required');
    }

    const [created] = await db
      .insert(customers)
      .values({
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        creditLimit: data.creditLimit || '0.00',
        notes: data.notes?.trim() || null,
      })
      .returning();

    return created;
  }

  async findAll(search?: string): Promise<Customer[]> {
    if (search && search.trim() !== '') {
      const pattern = `%${search.trim()}%`;
      return db
        .select()
        .from(customers)
        .where(or(ilike(customers.name, pattern), ilike(customers.phone, pattern)))
        .orderBy(customers.name);
    }
    return db.select().from(customers).orderBy(customers.name);
  }

  async findById(id: number): Promise<Customer> {
    const [found] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    if (!found) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return found;
  }

  async update(id: number, data: Partial<NewCustomer>): Promise<Customer> {
    await this.findById(id);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
    if (data.email !== undefined) updateData.email = data.email?.trim() || null;
    if (data.address !== undefined) updateData.address = data.address?.trim() || null;
    if (data.creditLimit !== undefined) updateData.creditLimit = data.creditLimit;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;

    const [updated] = await db
      .update(customers)
      .set(updateData)
      .where(eq(customers.id, id))
      .returning();

    return updated;
  }

  async delete(id: number): Promise<{ message: string }> {
    await this.findById(id);
    await db.delete(customers).where(eq(customers.id, id));
    return { message: `Customer with ID ${id} deleted successfully` };
  }
}
