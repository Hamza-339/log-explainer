import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CreateErrorEventDto } from './create-error-event.dto';
import { IngestService } from './ingest.service';

@Controller('ingest')
export class IngestController {
  constructor(private readonly ingestService: IngestService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async ingest(@Body() errorEvent: CreateErrorEventDto): Promise<void> {
    await this.ingestService.persistErrorEvent(errorEvent);
  }
}
