import { Global, Module } from '@nestjs/common';
import { BackgroundWorkService } from './background-work.service';

@Global()
@Module({
  providers: [BackgroundWorkService],
  exports: [BackgroundWorkService],
})
export class BackgroundWorkModule {}
