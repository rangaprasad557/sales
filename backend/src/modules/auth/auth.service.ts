import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { UsersService } from '../users/users.service';
import { User } from '../../db/schema';

export const AUTHORIZED_EMAILS = [
  'rangaprasad.557@gmail.com',
  'singarisurendra@gmail.com',
] as const;

export function isAuthorizedEmail(email: string): boolean {
  if (!email) return false;
  return AUTHORIZED_EMAILS.includes(email.toLowerCase().trim() as any);
}

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {
    const clientId = process.env.GOOGLE_CLIENT_ID || 'dummy-google-client-id';
    this.googleClient = new OAuth2Client(clientId);
  }

  async verifyGoogleToken(idToken: string): Promise<User> {
    if (!idToken) {
      throw new BadRequestException('Google idToken is required');
    }

    try {
      // In production or when valid clientId provided, verifyIdToken validates Google signature
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google token payload');
      }

      const email = payload.email.toLowerCase().trim();
      if (!isAuthorizedEmail(email)) {
        throw new ForbiddenException(
          `Access denied. ${email} is not authorized. Only rangaprasad.557@gmail.com and singarisurendra@gmail.com have access.`
        );
      }

      const user = await this.usersService.upsertGoogleUser({
        email,
        name: payload.name || email.split('@')[0],
        picture: payload.picture,
        googleId: payload.sub,
        role: 'full_access',
      });

      return user;
    } catch (error: any) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      // Allow structured test/mock token if development mode
      if (process.env.NODE_ENV !== 'production' && idToken.startsWith('mock-google-token:')) {
        const email = idToken.replace('mock-google-token:', '').trim().toLowerCase();
        if (!isAuthorizedEmail(email)) {
          throw new ForbiddenException(
            `Access denied. ${email} is not authorized. Only rangaprasad.557@gmail.com and singarisurendra@gmail.com have access.`
          );
        }
        return this.usersService.upsertGoogleUser({
          email,
          name: email.split('@')[0],
          googleId: `mock-google-${email}`,
          role: 'full_access',
        });
      }
      throw new UnauthorizedException(`Google authentication failed: ${error.message}`);
    }
  }

  async devLogin(email: string, role: string = 'full_access'): Promise<{ accessToken: string; user: User }> {
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Dev login is disabled in production environment');
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!isAuthorizedEmail(normalizedEmail)) {
      throw new ForbiddenException(
        `Access denied. ${normalizedEmail} is not authorized. Only rangaprasad.557@gmail.com and singarisurendra@gmail.com have access.`
      );
    }

    const user = await this.usersService.upsertGoogleUser({
      email: normalizedEmail,
      name: normalizedEmail.split('@')[0],
      googleId: `dev-sso-${normalizedEmail}`,
      role: 'full_access',
    });

    const accessToken = this.generateToken(user);
    return { accessToken, user };
  }

  generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }
}

