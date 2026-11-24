import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { IngestModule } from './ingest/ingest.module';

@Module({
  imports: [DatabaseModule, IngestModule],
})
export class AppModule {}
