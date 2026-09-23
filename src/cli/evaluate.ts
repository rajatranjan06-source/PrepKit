import * as fs from 'fs';
import * as path from 'path';
import { runGenerationPipeline } from '../services/pipeline';
import { createLLMService } from '../services/llm';
import { BatchCase, BatchOutput, BatchOutputCase } from '../types/kit';

/**
 * CLI runner for batch evaluation command:
 * npm run evaluate -- --input <cases.json> --output <kits.json>
 */
async function main() {
  const args = process.argv.slice(2);
  let inputPath = '';
  let outputPath = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      inputPath = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      outputPath = args[i + 1];
      i++;
    }
  }

  if (!inputPath || !outputPath) {
    console.error('Usage: npm run evaluate -- --input <cases.json> --output <kits.json>');
    process.exit(1);
  }

  const resolvedInput = path.resolve(process.cwd(), inputPath);
  const resolvedOutput = path.resolve(process.cwd(), outputPath);

  console.log(`[Batch Evaluation] Reading test cases from: ${resolvedInput}`);

  if (!fs.existsSync(resolvedInput)) {
    console.error(`Input file not found at: ${resolvedInput}`);
    process.exit(1);
  }

  const rawInput = fs.readFileSync(resolvedInput, 'utf-8');
  let cases: BatchCase[] = [];
  try {
    cases = JSON.parse(rawInput);
  } catch (err) {
    console.error(`Failed to parse input JSON: ${(err as Error).message}`);
    process.exit(1);
  }

  console.log("Env check - OPENAI_API_KEY:", process.env.OPENAI_API_KEY);
  console.log("Env check - LLM_PROVIDER:", process.env.LLM_PROVIDER);
  const llmService = createLLMService();
  const results: BatchOutputCase[] = [];

  for (let index = 0; index < cases.length; index++) {
    const item = cases[index];
    console.log(`\n[${index + 1}/${cases.length}] Processing case: "${item.id}" (${item.company_url})...`);

    try {
      const kit = await runGenerationPipeline({
        jobDescription: item.jd,
        companyUrl: item.company_url,
        daysBeforeInterview: item.days,
        llmService,
      });

      results.push({
        id: item.id,
        status: 'ok',
        kit,
        error: null,
      });
      console.log(`[Case ${item.id}] Successfully generated kit!`);
    } catch (err: any) {
      console.error(`[Case ${item.id}] Failed: ${err.message}\nStack: ${err.stack}`);
      
      let errorCode = 'GENERATION_FAILED';
      if (err.message.includes('SSRF') || err.message.includes('blocked')) {
        errorCode = 'SECURITY_BLOCKED';
      } else if (err.message.includes('ENOTFOUND') || err.message.includes('404') || err.message.includes('unreachable') || err.message.includes('timeout')) {
        errorCode = 'COMPANY_UNREACHABLE';
      }

      results.push({
        id: item.id,
        status: 'failed',
        kit: null,
        error: {
          code: errorCode,
          message: err.message || 'Pipeline execution failed',
        },
      });
    }
  }

  const outputPayload: BatchOutput = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    kits: results,
  };

  fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
  fs.writeFileSync(resolvedOutput, JSON.stringify(outputPayload, null, 2), 'utf-8');
  console.log(`\n[Batch Evaluation] Complete! Output saved to: ${resolvedOutput}`);
}

main().catch(err => {
  console.error('Fatal batch evaluation error:', err);
  process.exit(1);
});
