import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublicUser } from '../../application/types/public-user.type';
import { UserWithPassword } from '../../application/types/user-with-password.type';

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  updatedAt: true,
} as const;

const userWithPasswordSelect = {
  ...publicUserSelect,
  passwordHash: true,
} as const;

@Injectable()
export class AuthUsersRepository {
  constructor(private readonly prismaService: PrismaService) {}

  createUser(input: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<PublicUser> {
    return this.prismaService.user.create({
      data: input,
      select: publicUserSelect,
    });
  }

  findUserByEmail(email: string): Promise<UserWithPassword | null> {
    return this.prismaService.user.findUnique({
      where: { email },
      select: userWithPasswordSelect,
    });
  }

  findPublicUserById(id: string): Promise<PublicUser | null> {
    return this.prismaService.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
  }

  toPublicUser(user: UserWithPassword): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
