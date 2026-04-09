import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case';
import { PrismaService } from './infrastructure/prisma/prisma.service';
import { AuthUsersRepository } from './infrastructure/repositories/auth-users.repository';
import { PasswordHasherService } from './infrastructure/services/password-hasher.service';
import { AuthTokenService } from './infrastructure/services/auth-token.service';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { AuthController } from './presentation/auth.controller';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const accessTokenTtl =
          configService.get<string>('JWT_ACCESS_TOKEN_TTL') ?? '7d';

        return {
          secret:
            configService.get<string>('JWT_SECRET') ??
            'dev-only-secret-change-me',
          signOptions: {
            expiresIn: accessTokenTtl as never,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    PrismaService,
    AuthUsersRepository,
    PasswordHasherService,
    AuthTokenService,
    JwtStrategy,
    JwtAuthGuard,
    RegisterUseCase,
    LoginUseCase,
    GetCurrentUserUseCase,
  ],
})
export class AuthModule {}
