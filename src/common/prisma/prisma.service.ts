import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(configService: ConfigService) {
    const adapter = new PrismaPg({
      connectionString:
        configService.get<string>('DATABASE_URL') ??
        'postgresql://postgres:postgres@localhost:5432/dictionary_ai_be?schema=public',
    });

    super({
      adapter,
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
