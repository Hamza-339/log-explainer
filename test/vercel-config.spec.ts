import { readFileSync } from 'fs';
import { join } from 'path';

describe('vercel.json', () => {
  it('outputDirectory matches tsconfig outDir, so Vercel finds the real build output', () => {
    const tsconfig = JSON.parse(readFileSync(join(__dirname, '../tsconfig.json'), 'utf8'));
    const vercelConfig = JSON.parse(readFileSync(join(__dirname, '../vercel.json'), 'utf8'));

    const outDir = tsconfig.compilerOptions.outDir.replace(/^\.\//, '');
    expect(vercelConfig.outputDirectory).toBe(outDir);
  });
});
