import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import {
  ErrorExplanation,
  ErrorSeverity,
  ExplainerLlmClient,
  ExplainerLlmInput,
} from './explainer-llm-client.interface';

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

const EXPLANATION_TOOL = {
  name: 'record_explanation',
  description: 'Record a structured explanation of an application error event.',
  input_schema: {
    type: 'object' as const,
    properties: {
      summary: { type: 'string', description: 'Plain-language summary of the error.' },
      rootCause: { type: 'string', description: 'The likely underlying cause.' },
      suggestedFix: { type: 'string', description: 'A concrete suggested fix.' },
      severity: { type: 'string', enum: ['low', 'medium', 'high'] },
    },
    required: ['summary', 'rootCause', 'suggestedFix', 'severity'],
  },
};

@Injectable()
export class AnthropicExplainerClient implements ExplainerLlmClient {
  private readonly client = new Anthropic();
  private readonly model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;

  async explain(input: ExplainerLlmInput): Promise<ErrorExplanation> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      tools: [EXPLANATION_TOOL],
      tool_choice: { type: 'tool', name: EXPLANATION_TOOL.name },
      messages: [
        {
          role: 'user',
          content: this.buildPrompt(input),
        },
      ],
    });

    const toolUse = response.content.find((block) => block.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('Anthropic response did not include a tool_use block');
    }

    const explanation = toolUse.input as {
      summary: string;
      rootCause: string;
      suggestedFix: string;
      severity: ErrorSeverity;
    };

    return explanation;
  }

  private buildPrompt(input: ExplainerLlmInput): string {
    const { errorEvent, occurrenceCount } = input;
    return [
      `Error type: ${errorEvent.errorType}`,
      `Message: ${errorEvent.message}`,
      errorEvent.stack ? `Stack: ${errorEvent.stack}` : undefined,
      errorEvent.service ? `Service: ${errorEvent.service}` : undefined,
      errorEvent.environment ? `Environment: ${errorEvent.environment}` : undefined,
      `This error type has occurred ${occurrenceCount} time(s) so far.`,
      'Explain this error for an on-call engineer.',
    ]
      .filter(Boolean)
      .join('\n');
  }
}
