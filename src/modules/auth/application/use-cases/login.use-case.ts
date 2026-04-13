import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from '../../presentation/dto/login.dto';
import { AuthUsersRepository } from '../../infrastructure/repositories/auth-users.repository';
import { PasswordHasherService } from '../../infrastructure/services/password-hasher.service';
import { AuthTokenService } from '../../infrastructure/services/auth-token.service';
import { AuthResponse } from '../types/auth-response.type';
import { normalizeEmail } from '../helpers/normalize-email';
import { rethrowAuthPersistenceError } from '../../infrastructure/prisma/rethrow-auth-persistence-error';

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly authUsersRepository: AuthUsersRepository,
    private readonly passwordHasherService: PasswordHasherService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async execute(request: LoginDto): Promise<AuthResponse> {
    const email = normalizeEmail(request.email);
    try {
      const user = await this.authUsersRepository.findUserByEmail(email);

      if (!user) {
        throw new UnauthorizedException('invalid credentials');
      }

      const isPasswordValid = await this.passwordHasherService.compare(
        request.password,
        user.passwordHash,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('invalid credentials');
      }

      return {
        accessToken: await this.authTokenService.signAccessToken(user),
        user: this.authUsersRepository.toPublicUser(user),
      };
    } catch (error) {
      rethrowAuthPersistenceError(error);
    }
  }
}
