import { Test, TestingModule } from '@nestjs/testing';
import { QuessionsController } from './quessions.controller';
import { QuessionsService } from './quessions.service';

describe('QuessionsController', () => {
  let controller: QuessionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuessionsController],
      providers: [QuessionsService],
    }).compile();

    controller = module.get<QuessionsController>(QuessionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
