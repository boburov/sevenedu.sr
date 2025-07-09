import { Test, TestingModule } from '@nestjs/testing';
import { MigirationService } from './migiration.service';

describe('MigirationService', () => {
  let service: MigirationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MigirationService],
    }).compile();

    service = module.get<MigirationService>(MigirationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
