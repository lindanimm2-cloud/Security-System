import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import {
  ClientOAuthDto,
  ClientRegisterCompleteDto,
  ClientRegisterDto,
} from './dto/client-register.dto';
import { LoginDto } from './dto/login.dto';

function clientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim() || null;
  }
  return req.ip || req.socket.remoteAddress || null;
}

/** Stricter auth bucket: 20 attempts / 15 minutes per IP. */
const AUTH_THROTTLE = {
  default: { limit: 20, ttl: 15 * 60_000 },
  auth: { limit: 20, ttl: 15 * 60_000 },
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('client/login')
  @Throttle(AUTH_THROTTLE)
  clientLogin(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.loginClient(dto, { ipAddress: clientIp(req) });
  }

  @Get('client/invite/:token')
  clientInvitePreview(@Param('token') token: string) {
    return this.authService.getClientInvitePreview(token);
  }

  @Post('client/register')
  @Throttle(AUTH_THROTTLE)
  clientRegister(@Body() dto: ClientRegisterDto) {
    return this.authService.registerClient(dto);
  }

  @Post('client/register/complete')
  @Throttle(AUTH_THROTTLE)
  clientRegisterComplete(@Body() dto: ClientRegisterCompleteDto) {
    return this.authService.completeClientRegistration(dto);
  }

  @Post('client/oauth')
  @Throttle(AUTH_THROTTLE)
  clientOAuth(@Body() dto: ClientOAuthDto) {
    return this.authService.oauthClient(dto);
  }

  @Post('admin/login')
  @Throttle(AUTH_THROTTLE)
  adminLogin(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.loginAdmin(dto, { ipAddress: clientIp(req) });
  }

  @Post('officer/login')
  @Throttle(AUTH_THROTTLE)
  officerLogin(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.loginOfficer(dto, { ipAddress: clientIp(req) });
  }

  @Post('technician/login')
  @Throttle(AUTH_THROTTLE)
  technicianLogin(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.loginTechnician(dto, { ipAddress: clientIp(req) });
  }

  @Post('mfa/verify')
  @Throttle(AUTH_THROTTLE)
  verifyMfa(
    @Body() body: { mfaToken: string; code: string },
    @Req() req: Request,
  ) {
    return this.authService.verifyMfaLogin(body, clientIp(req));
  }

  @Post('mfa/setup/start')
  @Throttle(AUTH_THROTTLE)
  startMfaSetup(
    @Body() body: { mfaToken: string },
    @Req() req: Request,
  ) {
    return this.authService.startMfaSetup(body.mfaToken, clientIp(req));
  }

  @Post('mfa/setup/confirm')
  @Throttle(AUTH_THROTTLE)
  confirmMfaSetup(
    @Body() body: { mfaToken: string; code: string },
    @Req() req: Request,
  ) {
    return this.authService.confirmMfaSetup(body, clientIp(req));
  }

  @Get('mfa/status')
  @UseGuards(JwtAuthGuard)
  mfaStatus(@CurrentUser() user: { id: string }) {
    return this.authService.getMfaStatus(user.id);
  }

  @Post('mfa/setup/session-start')
  @UseGuards(JwtAuthGuard)
  @Throttle(AUTH_THROTTLE)
  startMfaFromSession(
    @CurrentUser() user: { id: string },
    @Req() req: Request,
  ) {
    return this.authService.startMfaSetupForAuthenticatedUser(user.id, clientIp(req));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: { id: string }) {
    return this.authService.getProfile(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(
    @CurrentUser() user: { id: string },
    @Body()
    body: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      jobTitle?: string | null;
    },
  ) {
    return this.authService.updateProfile(user.id, body);
  }
}
