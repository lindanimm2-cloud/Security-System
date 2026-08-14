import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import {
  ClientOAuthDto,
  ClientRegisterCompleteDto,
  ClientRegisterDto,
} from './dto/client-register.dto';
import { LoginDto } from './dto/login.dto';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('client/login')
  clientLogin(@Body() dto: LoginDto) {
    return this.authService.loginClient(dto);
  }

  @Get('client/invite/:token')
  clientInvitePreview(@Param('token') token: string) {
    return this.authService.getClientInvitePreview(token);
  }

  @Post('client/register')
  clientRegister(@Body() dto: ClientRegisterDto) {
    return this.authService.registerClient(dto);
  }

  @Post('client/register/complete')
  clientRegisterComplete(@Body() dto: ClientRegisterCompleteDto) {
    return this.authService.completeClientRegistration(dto);
  }

  @Post('client/oauth')
  clientOAuth(@Body() dto: ClientOAuthDto) {
    return this.authService.oauthClient(dto);
  }

  @Post('admin/login')
  adminLogin(@Body() dto: LoginDto) {
    return this.authService.loginAdmin(dto);
  }

  @Post('officer/login')
  officerLogin(@Body() dto: LoginDto) {
    return this.authService.loginOfficer(dto);
  }

  @Post('technician/login')
  technicianLogin(@Body() dto: LoginDto) {
    return this.authService.loginTechnician(dto);
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
