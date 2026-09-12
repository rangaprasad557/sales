import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, ilike, or } from 'drizzle-orm';
import { db } from '../../db/connection';
import { suppliers, Supplier, NewSupplier } from '../../db/schema';

export const VALID_PAYMENT_TERMS = ['Immediate', 'Net 15', 'Net 30', 'Net 60'] as const;

@Injectable()
export class SuppliersService {
  async create(data: {
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    paymentTerms?: string;
    notes?: string;
  }): Promise<Supplier> {
    if (!data.name || data.name.trim() === '') {
      throw new BadRequestException('Supplier name is required');
    }

    const terms = data.paymentTerms || 'Immediate';
    if (!VALID_PAYMENT_TERMS.includes(terms as any)) {
      throw new BadRequestException(`Invalid payment terms. Must be one of: ${VALID_PAYMENT_TERMS.join(', ')}`);
    }

    const [created] = await db
      .insert(suppliers)
      .values({
        name: data.name.trim(),
        contactPerson: data.contactPerson?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        paymentTerms: terms,
        notes: data.notes?.trim() || null,
      })
      .returning();

    return created;
  }

  async findAll(search?: string): Promise<Supplier[]> {
    if (search && search.trim() !== '') {
      const pattern = `%${search.trim()}%`;
      return db
        .select()
        .from(suppliers)
        .where(or(ilike(suppliers.name, pattern), ilike(suppliers.contactPerson, pattern)))
        .orderBy(suppliers.name);
    }
    return db.select().from(suppliers).orderBy(suppliers.name);
  }

  async findById(id: number): Promise<Supplier> {
    const [found] = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
    if (!found) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }
    return found;
  }

  async update(id: number, data: Partial<NewSupplier>): Promise<Supplier> {
    await this.findById(id);

    if (data.paymentTerms && !VALID_PAYMENT_TERMS.includes(data.paymentTerms as any)) {
      throw new BadRequestException(`Invalid payment terms. Must be one of: ${VALID_PAYMENT_TERMS.join(', ')}`);
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson?.trim() || null;
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
    if (data.email !== undefined) updateData.email = data.email?.trim() || null;
    if (data.address !== undefined) updateData.address = data.address?.trim() || null;
    if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;

    const [updated] = await db
      .update(suppliers)
      .set(updateData)
      .where(eq(suppliers.id, id))
      .returning();

    return updated;
  }

  async delete(id: number): Promise<{ message: string }> {
    await this.findById(id);
    await db.delete(suppliers).where(eq(suppliers.id, id));
    return { message: `Supplier with ID ${id} deleted successfully` };
  }
}
