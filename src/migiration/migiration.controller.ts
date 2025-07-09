import { Controller, Post } from '@nestjs/common';
import { MigrationService } from './migiration.service';

@Controller('migration')
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Post('move-files')
  async moveFiles() {
    return this.migrationService.migrateFiles();
  }
}