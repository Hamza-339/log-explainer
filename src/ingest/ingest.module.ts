import { Module } from '@nestjs/common';
import { FingerprintModule } from '../fingerprint/fingerprint.module';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';

@Module({
  imports: [FingerprintModule],
  controllers: [IngestController],
  providers: [IngestService],
})
export class IngestModule {}
