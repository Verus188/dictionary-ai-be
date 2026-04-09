import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';

@Injectable()
export class PasswordHasherService {
  private readonly saltRounds = 12;

  hash(value: string): Promise<string> {
    return hash(value, this.saltRounds);
  }

  compare(value: string, hashedValue: string): Promise<boolean> {
    return compare(value, hashedValue);
  }
}
