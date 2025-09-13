import { Test, TestingModule } from '@nestjs/testing';
import { SentencePuzzleController } from './sentence-puzzle.controller';
import { SentencePuzzleService } from './sentence-puzzle.service';

describe('SentencePuzzleController', () => {
  let controller: SentencePuzzleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SentencePuzzleController],
      providers: [SentencePuzzleService],
    }).compile();

    controller = module.get<SentencePuzzleController>(SentencePuzzleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
