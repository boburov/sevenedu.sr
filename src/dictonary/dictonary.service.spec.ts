import { Test, TestingModule } from '@nestjs/testing';
import { DictonaryService } from './dictonary.service';

describe('DictonaryService', () => {
  let service: DictonaryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DictonaryService],
    }).compile();

    service = module.get<DictonaryService>(DictonaryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
