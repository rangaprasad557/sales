import { Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../../db/connection';
import { users, User, NewUser } from '../../db/schema';

@Injectable()
export class UsersService {
  async findById(id: number): Promise<User | null> {
    const results = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return results[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const results = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    return results[0] || null;
  }

  async upsertGoogleUser(data: {
    email: string;
    name: string;
    picture?: string;
    googleId: string;
    role?: string;
  }): Promise<User> {
    const normalizedEmail = data.email.toLowerCase().trim();
    const existing = await this.findByEmail(normalizedEmail);

    if (existing) {
      // Update profile info
      const [updated] = await db
        .update(users)
        .set({
          name: data.name,
          picture: data.picture || existing.picture,
          googleId: data.googleId || existing.googleId,
        })
        .where(eq(users.id, existing.id))
        .returning();
      return updated;
    }

    // Default first user to admin or salesperson
    const allUsers = await db.select().from(users).limit(1);
    const assignedRole = data.role || (allUsers.length === 0 ? 'admin' : 'salesperson');

    const [created] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        name: data.name,
        picture: data.picture,
        googleId: data.googleId,
        role: assignedRole,
      })
      .returning();

    return created;
  }

  async listUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(users.id);
  }

  async updateRole(id: number, role: 'admin' | 'salesperson' | 'auditor'): Promise<User> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const [updated] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning();

    return updated;
  }
}
