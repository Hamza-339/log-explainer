import Anthropic from '@anthropic-ai/sdk';
import { ErrorExplanation } from '../src/explainer/explainer-llm-client.interface';

const DEFAULT_JUDGE_MODEL = 'claude-haiku-4-5-20251001';

export interface JudgeInput {
  labeledRootCause: string;
  explanation: ErrorExplanation;
}

export interface JudgeResult {
  score: number;
  reasoning: string;
}

const JUDGMENT_TOOL = {
  name: 'record_judgment',
  description: 'Record a usefulness score for a generated error explanation against the known root cause.',
  input_schema: {
    type: 'object' as const,
    properties: {
      score: {
        type: 'integer',
        description: '1 (useless/wrong) to 5 (accurately identifies the root cause and gives an actionable fix).',
        minimum: 1,
        maximum: 5,
      },
      reasoning: { type: 'string', description: 'One or two sentences justifying the score.' },
    },
    required: ['score', 'reasoning'],
  },
};

/**
 * Scores a generated explanation's usefulness against the fixture's labeled (ground
 * truth) root cause, so a lazy or wrong explanation scores low even if it reads fluently.
 */
export class AnthropicExplanationJudge {
  private readonly client = new Anthropic();
  private readonly model = process.env.ANTHROPIC_JUDGE_MODEL ?? DEFAULT_JUDGE_MODEL;

  async score(input: JudgeInput): Promise<JudgeResult> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 512,
      tools: [JUDGMENT_TOOL],
      tool_choice: { type: 'tool', name: JUDGMENT_TOOL.name },
      messages: [{ role: 'user', content: this.buildPrompt(input) }],
    });

    const toolUse = response.content.find((block) => block.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('Anthropic judge response did not include a tool_use block');
    }

    return toolUse.input as JudgeResult;
  }

  private buildPrompt(input: JudgeInput): string {
    const { labeledRootCause, explanation } = input;
    return [
      "You are grading an on-call tool's explanation of a production error against the error's known, ground-truth root cause.",
      `Known root cause: ${labeledRootCause}`,
      '',
      'Generated explanation:',
      `Summary: ${explanation.summary}`,
      `Root cause: ${explanation.rootCause}`,
      `Suggested fix: ${explanation.suggestedFix}`,
      `Severity: ${explanation.severity}`,
      '',
      'Score how useful this explanation would be to an on-call engineer, specifically whether it correctly identifies the known root cause and offers an actionable fix. A confident but wrong or generic explanation should score low.',
    ].join('\n');
  }
}
