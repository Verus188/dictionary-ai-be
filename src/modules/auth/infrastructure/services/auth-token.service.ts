import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PublicUser } from '../../application/types/public-user.type';

@Injectable()
export class AuthTokenService {
  constructor(private readonly jwtService: JwtService) {}

  signAccessToken(user: PublicUser): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });
  }
}
