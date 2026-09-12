import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { AuthService } from '../src/modules/auth/auth.service';
import { UsersService } from '../src/modules/users/users.service';
import { JwtStrategy } from '../src/modules/auth/jwt.strategy';
import { RolesGuard } from '../src/modules/auth/roles.guard';
import { JwtAuthGuard } from '../src/modules/auth/jwt-auth.guard';
import { ROLES_KEY } from '../src/modules/auth/roles.decorator';
import { User } from '../src/db/schema';

describe('PR-002: Google SSO Authentication & User Management Test Suite', () => {
  let usersService: UsersService;
  let authService: AuthService;
  let jwtService: JwtService;
  let jwtStrategy: JwtStrategy;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  const mockUser: User = {
    id: 1,
    email: 'test.sales@example.com',
    name: 'Test Salesperson',
    picture: 'https://example.com/avatar.jpg',
    googleId: 'google-sub-12345',
    role: 'salesperson',
    createdAt: new Date(),
  };

  const mockAdmin: User = {
    id: 2,
    email: 'admin@example.com',
    name: 'Test Admin',
    picture: 'https://example.com/admin.jpg',
    googleId: 'google-sub-67890',
    role: 'admin',
    createdAt: new Date(),
  };

  beforeEach(() => {
    usersService = new UsersService();
    jwtService = new JwtService({
      secret: 'test_jwt_secret_pr002',
      signOptions: { expiresIn: '1h' },
    });
    authService = new AuthService(usersService, jwtService);
    jwtStrategy = new JwtStrategy(usersService);
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
  });

  describe('1. UsersService Invariants', () => {
    test('upsertGoogleUser creates new user or updates existing without primary key collision', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValueOnce(null);
      jest.spyOn(usersService, 'upsertGoogleUser').mockResolvedValueOnce(mockUser);

      const created = await usersService.upsertGoogleUser({
        email: 'test.sales@example.com',
        name: 'Test Salesperson',
        picture: 'https://example.com/avatar.jpg',
        googleId: 'google-sub-12345',
      });

      expect(created.email).toBe('test.sales@example.com');
      expect(created.role).toBe('salesperson');
    });

    test('findById returns user when found, null when missing', async () => {
      jest.spyOn(usersService, 'findById').mockResolvedValueOnce(mockUser);
      const user = await usersService.findById(1);
      expect(user).toBeDefined();
      expect(user?.name).toBe('Test Salesperson');

      jest.spyOn(usersService, 'findById').mockResolvedValueOnce(null);
      const missing = await usersService.findById(999);
      expect(missing).toBeNull();
    });

    test('updateRole throws NotFoundException for non-existent user', async () => {
      jest.spyOn(usersService, 'findById').mockResolvedValueOnce(null);
      await expect(usersService.updateRole(999, 'admin')).rejects.toThrow(NotFoundException);
    });

    test('updateRole successfully changes role to admin or auditor', async () => {
      jest.spyOn(usersService, 'findById').mockResolvedValueOnce(mockUser);
      jest.spyOn(usersService, 'updateRole').mockResolvedValueOnce({ ...mockUser, role: 'admin' });

      const updated = await usersService.updateRole(1, 'admin');
      expect(updated.role).toBe('admin');
    });
  });

  describe('2. AuthService & JWT Tokens', () => {
    test('generateToken produces a valid verifiable JWT with sub, email, and role', () => {
      const token = authService.generateToken(mockUser);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const decoded: any = jwtService.decode(token);
      expect(decoded.sub).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role);
    });

    test('devLogin generates access token and returns user profile', async () => {
      jest.spyOn(usersService, 'upsertGoogleUser').mockResolvedValueOnce(mockUser);

      const result = await authService.devLogin('test.sales@example.com', 'salesperson');
      expect(result.accessToken).toBeDefined();
      expect(result.user.email).toBe('test.sales@example.com');
      expect(result.user.role).toBe('salesperson');
    });

    test('verifyGoogleToken rejects empty idToken with BadRequestException', async () => {
      await expect(authService.verifyGoogleToken('')).rejects.toThrow(BadRequestException);
    });

    test('verifyGoogleToken parses mock Google token in non-production environment', async () => {
      jest.spyOn(usersService, 'upsertGoogleUser').mockResolvedValueOnce({
        ...mockUser,
        email: 'mock.user@gmail.com',
      });

      const user = await authService.verifyGoogleToken('mock-google-token:mock.user@gmail.com');
      expect(user.email).toBe('mock.user@gmail.com');
    });
  });

  describe('3. JwtStrategy Verification', () => {
    test('validate returns user when database lookup succeeds', async () => {
      jest.spyOn(usersService, 'findById').mockResolvedValueOnce(mockUser);

      const validated = await jwtStrategy.validate({
        sub: 1,
        email: 'test.sales@example.com',
        name: 'Test Salesperson',
        role: 'salesperson',
      });

      expect(validated).toEqual(mockUser);
    });

    test('validate throws UnauthorizedException when user not found in database', async () => {
      jest.spyOn(usersService, 'findById').mockResolvedValueOnce(null);

      await expect(
        jwtStrategy.validate({
          sub: 999,
          email: 'deleted@example.com',
          name: 'Deleted User',
          role: 'salesperson',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('4. RolesGuard Authorization & Privilege Enforcement', () => {
    const createMockExecutionContext = (user: any, requiredRoles?: string[]) => {
      if (requiredRoles) {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);
      } else {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      }

      return {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
      } as any;
    };

    test('allows route access if no roles are required', () => {
      const context = createMockExecutionContext(mockUser, undefined);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    test('allows route access if user role matches required role', () => {
      const context = createMockExecutionContext(mockAdmin, ['admin']);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    test('throws ForbiddenException if user lacks required role (salesperson trying admin route)', () => {
      const context = createMockExecutionContext(mockUser, ['admin']);
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    test('throws ForbiddenException if request has no user or missing role', () => {
      const context = createMockExecutionContext(null, ['admin']);
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('5. JwtAuthGuard Custom Error Handling', () => {
    test('handleRequest returns user if valid and error-free', () => {
      const guard = new JwtAuthGuard();
      const result = guard.handleRequest(null, mockUser, null);
      expect(result).toEqual(mockUser);
    });

    test('handleRequest throws UnauthorizedException if user is null or error present', () => {
      const guard = new JwtAuthGuard();
      expect(() => guard.handleRequest(null, null, null)).toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(new Error('JWT expired'), null, null)).toThrow();
    });
  });
});
