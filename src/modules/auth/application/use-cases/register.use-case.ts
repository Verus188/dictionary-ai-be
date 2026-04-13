import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RegisterDto } from '../../presentation/dto/register.dto';
import { AuthUsersRepository } from '../../infrastructure/repositories/auth-users.repository';
import { PasswordHasherService } from '../../infrastructure/services/password-hasher.service';
import { AuthTokenService } from '../../infrastructure/services/auth-token.service';
import { AuthResponse } from '../types/auth-response.type';
import { normalizeEmail } from '../helpers/normalize-email';
import { rethrowAuthPersistenceError } from '../../infrastructure/prisma/rethrow-auth-persistence-error';

@Injectable()
export class RegisterUseCase {
  constructor(
    private readonly authUsersRepository: AuthUsersRepository,
    private readonly passwordHasherService: PasswordHasherService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async execute(request: RegisterDto): Promise<AuthResponse> {
    const email = normalizeEmail(request.email);

    try {
      const existingUser = await this.authUsersRepository.findUserByEmail(email);

      if (existingUser) {
        throw new ConflictException('email is already in use');
      }

      const passwordHash = await this.passwordHasherService.hash(
        request.password,
      );

      const user = await this.authUsersRepository.createUser({
        name: request.name.trim(),
        email,
        passwordHash,
      });

      return {
        accessToken: await this.authTokenService.signAccessToken(user),
        user,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('email is already in use');
      }

      rethrowAuthPersistenceError(error);
    }
  }
}
