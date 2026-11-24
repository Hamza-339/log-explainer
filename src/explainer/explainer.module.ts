import { Module } from '@nestjs/common';
import { AnthropicExplainerClient } from './anthropic-explainer-client';
import { EXPLAINER_LLM_CLIENT } from './explainer-llm-client.interface';
import { ExplainerService } from './explainer.service';

@Module({
  providers: [
    ExplainerService,
    { provide: EXPLAINER_LLM_CLIENT, useClass: AnthropicExplainerClient },
  ],
  exports: [ExplainerService],
})
export class ExplainerModule {}
