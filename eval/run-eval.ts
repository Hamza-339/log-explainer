import 'dotenv/config';
import { AnthropicExplainerClient } from '../src/explainer/anthropic-explainer-client';
import { fixtures } from './fixtures';
import { AnthropicExplanationJudge } from './judge';
import { determineNovelFixtures, scoreFingerprintAccuracy } from './scoring';

async function main(): Promise<void> {
  const scoringResult = scoreFingerprintAccuracy(fixtures);
  const novelFixtures = determineNovelFixtures(fixtures, scoringResult.fingerprintsByFixtureId);

  const explainerClient = new AnthropicExplainerClient();
  const judge = new AnthropicExplanationJudge();

  const judgeScores: number[] = [];

  for (const fixture of novelFixtures) {
    const explanation = await explainerClient.explain({
      errorEvent: fixture.errorEvent,
      occurrenceCount: 1,
    });

    const judgment = await judge.score({
      labeledRootCause: fixture.labeledRootCause,
      explanation,
    });

    judgeScores.push(judgment.score);
    console.log(`[${fixture.id}] quality=${judgment.score}/5 — ${judgment.reasoning}`);
  }

  const averageQuality =
    judgeScores.length === 0 ? 0 : judgeScores.reduce((sum, score) => sum + score, 0) / judgeScores.length;

  console.log('\n=== Eval summary ===');
  console.log(`Fixtures: ${fixtures.length} (${novelFixtures.length} novel)`);
  console.log(`Fingerprint precision: ${scoringResult.precision.toFixed(2)}`);
  console.log(`Fingerprint recall: ${scoringResult.recall.toFixed(2)}`);
  console.log(`False merges (distinct bugs merged into one fingerprint): ${scoringResult.falseMerges}`);
  console.log(`Missed dedups (same bug treated as novel): ${scoringResult.missedDedups}`);
  console.log(`Average explanation quality: ${averageQuality.toFixed(2)}/5`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
