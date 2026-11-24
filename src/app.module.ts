import { Module } from '@nestjs/common';
import { BackgroundWorkModule } from './background/background-work.module';
import { DatabaseModule } from './database/database.module';
import { IngestModule } from './ingest/ingest.module';

@Module({
  imports: [DatabaseModule, BackgroundWorkModule, IngestModule],
})
export class AppModule {}
