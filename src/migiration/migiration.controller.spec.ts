import { Test, TestingModule } from '@nestjs/testing';
import { MigirationController } from './migiration.controller';

describe('MigirationController', () => {
  let controller: MigirationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MigirationController],
    }).compile();

    controller = module.get<MigirationController>(MigirationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
