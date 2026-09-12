import { Controller, Post, Get, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleAuth(@Body('idToken') idToken: string) {
    const user = await this.authService.verifyGoogleToken(idToken);
    const accessToken = this.authService.generateToken(user);
    return {
      status: 'success',
      message: 'Authentication successful',
      data: {
        accessToken,
        user,
      },
    };
  }

  @Post('dev-login')
  @HttpCode(HttpStatus.OK)
  async devLogin(
    @Body('email') email: string,
    @Body('role') role?: 'admin' | 'salesperson' | 'auditor',
  ) {
    const result = await this.authService.devLogin(email || 'sales@store.local', role);
    return {
      status: 'success',
      message: 'Dev login successful',
      data: result,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any) {
    return {
      status: 'success',
      data: req.user,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout() {
    return {
      status: 'success',
      message: 'Logged out successfully',
    };
  }
}
