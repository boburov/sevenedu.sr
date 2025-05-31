import { Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';

@Module({
  exports: [UploadsService],
  providers: [UploadsService]
})
export class UploadsModule { }
