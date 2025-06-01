import { Test, TestingModule } from '@nestjs/testing';
import { QuessionsService } from './quessions.service';

describe('QuessionsService', () => {
  let service: QuessionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuessionsService],
    }).compile();

    service = module.get<QuessionsService>(QuessionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
