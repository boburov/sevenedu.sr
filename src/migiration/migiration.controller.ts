// src/aws/aws.controller.ts
import { Controller, Post } from '@nestjs/common';
import { MigirationService } from './migiration.service';

@Controller('aws')
export class MigirationController {
  constructor(private readonly awsMigrationService: MigirationService) {}

  @Post('migrate')
  migrate() {
    return this.awsMigrationService.migrateAllFiles();
  }
}
