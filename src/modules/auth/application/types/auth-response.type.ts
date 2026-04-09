import { PublicUser } from './public-user.type';

export type AuthResponse = {
  accessToken: string;
  user: PublicUser;
};
