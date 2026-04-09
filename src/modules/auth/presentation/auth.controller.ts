import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterUseCase } from '../application/use-cases/register.use-case';
import { LoginUseCase } from '../application/use-cases/login.use-case';
import { GetCurrentUserUseCase } from '../application/use-cases/get-current-user.use-case';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedRequestUser } from '../application/types/authenticated-request-user.type';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
  ) {}

  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.registerUseCase.execute(body);
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.loginUseCase.execute(body);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.getCurrentUserUseCase.execute(user.sub);
  }
}
