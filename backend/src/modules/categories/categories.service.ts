import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { eq, ilike } from 'drizzle-orm';
import { db } from '../../db/connection';
import { categories, Category, NewCategory } from '../../db/schema';

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

@Injectable()
export class CategoriesService {
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async create(data: {
    name: string;
    slug?: string;
    parentId?: number;
    icon?: string;
    description?: string;
  }): Promise<Category> {
    if (!data.name || data.name.trim() === '') {
      throw new BadRequestException('Category name is required');
    }

    const slug = data.slug ? this.generateSlug(data.slug) : this.generateSlug(data.name);

    const [existingSlug] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    if (existingSlug) {
      throw new ConflictException(`Category with slug '${slug}' already exists`);
    }

    if (data.parentId) {
      const parent = await this.findById(data.parentId);
      if (!parent) {
        throw new BadRequestException(`Parent category with ID ${data.parentId} does not exist`);
      }
    }

    const [created] = await db
      .insert(categories)
      .values({
        name: data.name.trim(),
        slug,
        parentId: data.parentId || null,
        icon: data.icon?.trim() || 'folder',
        description: data.description?.trim() || null,
      })
      .returning();

    return created;
  }

  async findAll(search?: string): Promise<Category[]> {
    if (search && search.trim() !== '') {
      const pattern = `%${search.trim()}%`;
      return db.select().from(categories).where(ilike(categories.name, pattern)).orderBy(categories.name);
    }
    return db.select().from(categories).orderBy(categories.name);
  }

  async findById(id: number): Promise<Category> {
    const [found] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    if (!found) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return found;
  }

  async findTree(): Promise<CategoryTreeNode[]> {
    const all = await this.findAll();
    const map = new Map<number, CategoryTreeNode>();

    for (const cat of all) {
      map.set(cat.id, { ...cat, children: [] });
    }

    const roots: CategoryTreeNode[] = [];
    for (const cat of all) {
      const node = map.get(cat.id)!;
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async update(id: number, data: Partial<NewCategory>): Promise<Category> {
    await this.findById(id);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.slug !== undefined) updateData.slug = this.generateSlug(data.slug);
    if (data.parentId !== undefined) {
      if (data.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }
      if (data.parentId) {
        await this.findById(data.parentId);
      }
      updateData.parentId = data.parentId || null;
    }
    if (data.icon !== undefined) updateData.icon = data.icon?.trim() || 'folder';
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;

    const [updated] = await db
      .update(categories)
      .set(updateData)
      .where(eq(categories.id, id))
      .returning();

    return updated;
  }

  async delete(id: number): Promise<{ message: string }> {
    await this.findById(id);
    await db.delete(categories).where(eq(categories.id, id));
    return { message: `Category with ID ${id} deleted successfully` };
  }
}
