import { Test, TestingModule } from '@nestjs/testing';
import { DictonaryController } from './dictonary.controller';
import { DictonaryService } from './dictonary.service';

describe('DictonaryController', () => {
  let controller: DictonaryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DictonaryController],
      providers: [DictonaryService],
    }).compile();

    controller = module.get<DictonaryController>(DictonaryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
