import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { BatchOutputSchema } from '../src/types/kit';

describe('Batch Evaluation Command (npm run evaluate)', () => {
  const sampleInputPath = path.resolve(__dirname, 'test-cases.json');
  const sampleOutputPath = path.resolve(__dirname, 'test-kits-out.json');

  beforeAll(() => {
    const cases = [
      {
        id: 'test-case-01',
        jd: 'Senior Backend Engineer with Node.js and MongoDB experience.',
        company_url: 'https://example.com/acme',
        days: 5,
      },
    ];
    fs.writeFileSync(sampleInputPath, JSON.stringify(cases, null, 2), 'utf-8');
  });

  afterAll(() => {
    if (fs.existsSync(sampleInputPath)) fs.unlinkSync(sampleInputPath);
    if (fs.existsSync(sampleOutputPath)) fs.unlinkSync(sampleOutputPath);
  });

  it('should execute batch evaluation command and output Appendix B compliant JSON', () => {
    const cmd = `npx ts-node src/cli/evaluate.ts --input "${sampleInputPath}" --output "${sampleOutputPath}"`;
    execSync(cmd, { cwd: process.cwd(), stdio: 'pipe' });

    expect(fs.existsSync(sampleOutputPath)).toBe(true);
    const rawOut = fs.readFileSync(sampleOutputPath, 'utf-8');
    const parsedOut = JSON.parse(rawOut);

    if (parsedOut.kits[0]?.status !== 'ok') {
      console.log('Evaluator test case output:', JSON.stringify(parsedOut, null, 2));
    }

    const validation = BatchOutputSchema.safeParse(parsedOut);
    expect(validation.success).toBe(true);
    expect(parsedOut.version).toBe('1.0');
    expect(parsedOut.kits).toHaveLength(1);
    expect(parsedOut.kits[0].id).toBe('test-case-01');
    expect(parsedOut.kits[0].status).toBe('ok');
  });
});
