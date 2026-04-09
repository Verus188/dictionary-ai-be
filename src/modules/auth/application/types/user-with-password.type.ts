import { PublicUser } from './public-user.type';

export type UserWithPassword = PublicUser & {
  passwordHash: string;
};
