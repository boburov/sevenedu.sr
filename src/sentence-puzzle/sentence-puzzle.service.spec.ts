import { Test, TestingModule } from '@nestjs/testing';
import { SentencePuzzleService } from './sentence-puzzle.service';

describe('SentencePuzzleService', () => {
  let service: SentencePuzzleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SentencePuzzleService],
    }).compile();

    service = module.get<SentencePuzzleService>(SentencePuzzleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
