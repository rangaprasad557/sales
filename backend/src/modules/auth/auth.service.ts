import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { UsersService } from '../users/users.service';
import { User } from '../../db/schema';

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

      const user = await this.usersService.upsertGoogleUser({
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        picture: payload.picture,
        googleId: payload.sub,
      });

      return user;
    } catch (error: any) {
      // Allow structured test/mock token if development mode
      if (process.env.NODE_ENV !== 'production' && idToken.startsWith('mock-google-token:')) {
        const email = idToken.replace('mock-google-token:', '').trim();
        return this.usersService.upsertGoogleUser({
          email,
          name: email.split('@')[0],
          googleId: `mock-google-${email}`,
        });
      }
      throw new UnauthorizedException(`Google authentication failed: ${error.message}`);
    }
  }

  async devLogin(email: string, role: 'admin' | 'salesperson' | 'auditor' = 'salesperson'): Promise<{ accessToken: string; user: User }> {
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Dev login is disabled in production environment');
    }

    const user = await this.usersService.upsertGoogleUser({
      email,
      name: email.split('@')[0],
      googleId: `dev-sso-${email}`,
      role,
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
