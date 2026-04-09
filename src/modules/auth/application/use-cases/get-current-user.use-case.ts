import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthUsersRepository } from '../../infrastructure/repositories/auth-users.repository';
import { PublicUser } from '../types/public-user.type';

@Injectable()
export class GetCurrentUserUseCase {
  constructor(private readonly authUsersRepository: AuthUsersRepository) {}

  async execute(userId: string): Promise<PublicUser> {
    const user = await this.authUsersRepository.findPublicUserById(userId);

    if (!user) {
      throw new NotFoundException('user not found');
    }

    return user;
  }
}
