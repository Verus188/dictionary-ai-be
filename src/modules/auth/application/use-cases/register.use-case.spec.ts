import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RegisterUseCase } from './register.use-case';
import { AuthUsersRepository } from '../../infrastructure/repositories/auth-users.repository';
import { PasswordHasherService } from '../../infrastructure/services/password-hasher.service';
import { AuthTokenService } from '../../infrastructure/services/auth-token.service';

describe('RegisterUseCase', () => {
  let useCase: RegisterUseCase;
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

    useCase = new RegisterUseCase(
      authUsersRepository,
      passwordHasherService,
      authTokenService,
    );
  });

  it('creates a user and returns an access token', async () => {
    const createdUser = {
      id: 'user-1',
      name: 'Nikita',
      email: 'nikita@example.com',
      createdAt: new Date('2026-04-09T00:00:00.000Z'),
      updatedAt: new Date('2026-04-09T00:00:00.000Z'),
    };

    authUsersRepository.findUserByEmail.mockResolvedValue(null);
    passwordHasherService.hash.mockResolvedValue('hashed-password');
    authUsersRepository.createUser.mockResolvedValue(createdUser);
    authTokenService.signAccessToken.mockResolvedValue('access-token');

    await expect(
      useCase.execute({
        name: '  Nikita  ',
        email: 'Nikita@Example.com',
        password: 'supersecret',
      }),
    ).resolves.toEqual({
      accessToken: 'access-token',
      user: createdUser,
    });

    expect(authUsersRepository.findUserByEmail).toHaveBeenCalledWith(
      'nikita@example.com',
    );
    expect(authUsersRepository.createUser).toHaveBeenCalledWith({
      name: 'Nikita',
      email: 'nikita@example.com',
      passwordHash: 'hashed-password',
    });
  });

  it('throws when email is already in use', async () => {
    authUsersRepository.findUserByEmail.mockResolvedValue({
      id: 'user-1',
      name: 'Nikita',
      email: 'nikita@example.com',
      passwordHash: 'hashed-password',
      createdAt: new Date('2026-04-09T00:00:00.000Z'),
      updatedAt: new Date('2026-04-09T00:00:00.000Z'),
    });

    await expect(
      useCase.execute({
        name: 'Nikita',
        email: 'nikita@example.com',
        password: 'supersecret',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws a service unavailable error when auth storage is not initialized', async () => {
    authUsersRepository.findUserByEmail.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        'The table `public.users` does not exist in the current database.',
        {
          code: 'P2021',
          clientVersion: '7.7.0',
          meta: {
            modelName: 'User',
          },
        },
      ),
    );

    await expect(
      useCase.execute({
        name: 'Nikita',
        email: 'nikita@example.com',
        password: 'secret6',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
