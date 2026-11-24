export const EXPLAINER_LLM_CLIENT = 'EXPLAINER_LLM_CLIENT';

export interface ExplainerLlmInput {
  errorEvent: {
    errorType: string;
    message: string;
    stack?: string;
    service?: string;
    environment?: string;
  };
  occurrenceCount: number;
}

export type ErrorSeverity = 'low' | 'medium' | 'high';

export interface ErrorExplanation {
  summary: string;
  rootCause: string;
  suggestedFix: string;
  severity: ErrorSeverity;
}

export interface ExplainerLlmClient {
  explain(input: ExplainerLlmInput): Promise<ErrorExplanation>;
}
