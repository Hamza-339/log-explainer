import { Module } from '@nestjs/common';
import { ExplainerModule } from '../explainer/explainer.module';
import { FingerprintModule } from '../fingerprint/fingerprint.module';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';

@Module({
  imports: [FingerprintModule, ExplainerModule],
  controllers: [IngestController],
  providers: [IngestService],
})
export class IngestModule {}
