import { Controller, Post } from '@nestjs/common';
import { MigirationService } from './migiration.service';

@Controller('migiration')
export class MigirationController {
  constructor(private readonly service: MigirationService) {}

  @Post('/fix-urls')
  fixAllUrls() {
    return this.service.fixAllUrls();
  }
}
