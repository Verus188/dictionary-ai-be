import { UnauthorizedException } from '@nestjs/common';
import { LoginUseCase } from './login.use-case';
import { AuthUsersRepository } from '../../infrastructure/repositories/auth-users.repository';
import { PasswordHasherService } from '../../infrastructure/services/password-hasher.service';
import { AuthTokenService } from '../../infrastructure/services/auth-token.service';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let authUsersRepository: jest.Mocked<AuthUsersRepository>;
  let passwordHasherService: jest.Mocked<PasswordHasherService>;
  let authTokenService: jest.Mocked<AuthTokenService>;

  beforeEach(() => {
    authUsersRepository = {
      findUserByEmail: jest.fn(),
      createUser: jest.fn(),
      findPublicUserById: jest.fn(),
      toPublicUser: jest.fn(),
    } as unknown as jest.Mocked<AuthUsersRepository>;

    passwordHasherService = {
      hash: jest.fn(),
      compare: jest.fn(),
    } as unknown as jest.Mocked<PasswordHasherService>;

    authTokenService = {
      signAccessToken: jest.fn(),
    } as unknown as jest.Mocked<AuthTokenService>;

    useCase = new LoginUseCase(
      authUsersRepository,
      passwordHasherService,
      authTokenService,
    );
  });

  it('returns an access token for valid credentials', async () => {
    const user = {
      id: 'user-1',
      name: 'Nikita',
      email: 'nikita@example.com',
      passwordHash: 'hashed-password',
      createdAt: new Date('2026-04-09T00:00:00.000Z'),
      updatedAt: new Date('2026-04-09T00:00:00.000Z'),
    };

    authUsersRepository.findUserByEmail.mockResolvedValue(user);
    authUsersRepository.toPublicUser.mockReturnValue({
      id: 'user-1',
      name: 'Nikita',
      email: 'nikita@example.com',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
    passwordHasherService.compare.mockResolvedValue(true);
    authTokenService.signAccessToken.mockResolvedValue('access-token');

    await expect(
      useCase.execute({
        email: 'NIKITA@example.com',
        password: 'supersecret',
      }),
    ).resolves.toEqual({
      accessToken: 'access-token',
      user: {
        id: 'user-1',
        name: 'Nikita',
        email: 'nikita@example.com',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  });

  it('throws for invalid credentials', async () => {
    authUsersRepository.findUserByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({
        email: 'nikita@example.com',
        password: 'supersecret',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
