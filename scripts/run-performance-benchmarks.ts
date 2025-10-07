#!/usr/bin/env tsx

/**
 * Performance Benchmark Runner
 *
 * Usage:
 *   npm run benchmark:performance           # Run all benchmarks
 *   npm run benchmark:clustering            # Run clustering benchmarks only
 *   npm run benchmark:embeddings           # Run embedding benchmarks only
 *   npm run benchmark:database             # Run database benchmarks only
 *   npm run benchmark:integration          # Run integration benchmarks only
 */

import dotenv from 'dotenv';
import { performance } from 'perf_hooks';
import { performanceBenchmarks } from '../server/services/performance-benchmarks';

// Load environment variables
dotenv.config();

interface BenchmarkOptions {
  suite?: 'clustering' | 'embeddings' | 'database' | 'integration' | 'all';
  verbose?: boolean;
  iterations?: number;
  output?: 'console' | 'json' | 'markdown';
}

class BenchmarkRunner {
  private options: BenchmarkOptions;

  constructor(options: BenchmarkOptions = {}) {
    this.options = {
      suite: 'all',
      verbose: false,
      iterations: 1,
      output: 'console',
      ...options,
    };
  }

  async run(): Promise<void> {
    console.log('🚀 LLM.txt Mastery Performance Benchmarks');
    console.log('==========================================\n');

    const startTime = performance.now();

    try {
      // Initialize benchmark service
      console.log('🔧 Initializing benchmark environment...');
      await this.verifyEnvironment();
      console.log('✅ Environment verified\n');

      const results = await this.runBenchmarks();

      const endTime = performance.now();
      const totalDuration = Math.round(endTime - startTime);

      // Output results
      await this.outputResults(results, totalDuration);

      // Check overall health
      const overallPassed = results.every((suite) => suite.summary.overallPassed);
      const exitCode = overallPassed ? 0 : 1;

      console.log('\n==========================================');
      console.log(`🏁 Benchmarks completed in ${this.formatDuration(totalDuration)}`);
      console.log(`${overallPassed ? '✅ All benchmarks passed' : '❌ Some benchmarks failed'}`);

      process.exit(exitCode);
    } catch (error) {
      console.error('❌ Benchmark execution failed:', error);
      process.exit(1);
    }
  }

  private async verifyEnvironment(): Promise<void> {
    // Check required environment variables
    const requiredVars = ['DATABASE_URL'];
    const missingVars = requiredVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Check optional but recommended variables
    const optionalVars = ['OPENAI_API_KEY', 'REDIS_HOST'];
    const missingOptional = optionalVars.filter((varName) => !process.env[varName]);

    if (missingOptional.length > 0) {
      console.log(
        `⚠️  Missing optional variables (some benchmarks may be skipped): ${missingOptional.join(', ')}`
      );
    }

    // Verify service health
    const healthCheck = await performanceBenchmarks.healthCheck();
    if (healthCheck.status !== 'healthy') {
      throw new Error(`Service health check failed: ${JSON.stringify(healthCheck.details)}`);
    }
  }

  private async runBenchmarks(): Promise<any[]> {
    const { suite, iterations } = this.options;
    const results: any[] = [];

    for (let i = 0; i < iterations!; i++) {
      if (iterations! > 1) {
        console.log(`\n📊 Running iteration ${i + 1}/${iterations}...\n`);
      }

      let suiteResults: any[] = [];

      switch (suite) {
        case 'clustering':
          suiteResults.push({
            suite: 'clustering',
            benchmarks: await performanceBenchmarks.runClusteringBenchmarks(),
          });
          break;

        case 'embeddings':
          suiteResults.push({
            suite: 'embeddings',
            benchmarks: await performanceBenchmarks.runEmbeddingBenchmarks(),
          });
          break;

        case 'database':
          suiteResults.push({
            suite: 'database',
            benchmarks: await performanceBenchmarks.runDatabaseBenchmarks(),
          });
          break;

        case 'integration':
          suiteResults.push({
            suite: 'integration',
            benchmarks: await performanceBenchmarks.runIntegrationBenchmarks(),
          });
          break;

        case 'all':
        default:
          suiteResults = await performanceBenchmarks.runAllBenchmarks();
          break;
      }

      results.push(...suiteResults);
    }

    // Average results if multiple iterations
    if (iterations! > 1) {
      return this.averageResults(results);
    }

    return results;
  }

  private averageResults(results: any[]): any[] {
    // Group results by suite
    const groupedResults = results.reduce((acc, result) => {
      if (!acc[result.suite]) {
        acc[result.suite] = [];
      }
      acc[result.suite].push(result);
      return acc;
    }, {});

    // Average each suite
    return Object.entries(groupedResults).map(([suite, suiteResults]: [string, any]) => {
      const averaged = suiteResults[0]; // Start with first result structure

      // Average the benchmarks
      averaged.benchmarks = averaged.benchmarks.map((benchmark: any, index: number) => {
        const values = suiteResults.map((r: any) => r.benchmarks[index]);

        return {
          ...benchmark,
          duration: this.average(values.map((v: any) => v.duration)),
          throughput: this.average(values.map((v: any) => v.throughput)),
          results: {
            ...benchmark.results,
            avgResponseTime: this.average(values.map((v: any) => v.results.avgResponseTime)),
            operationsPerSecond: this.average(
              values.map((v: any) => v.results.operationsPerSecond)
            ),
            memoryPeak: this.average(values.map((v: any) => v.results.memoryPeak)),
          },
        };
      });

      return averaged;
    });
  }

  private average(numbers: number[]): number {
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  private async outputResults(results: any[], totalDuration: number): Promise<void> {
    switch (this.options.output) {
      case 'json':
        await this.outputJSON(results, totalDuration);
        break;
      case 'markdown':
        await this.outputMarkdown(results, totalDuration);
        break;
      case 'console':
      default:
        this.outputConsole(results, totalDuration);
        break;
    }
  }

  private outputConsole(results: any[], totalDuration: number): void {
    for (const suiteResult of results) {
      const suite = suiteResult.suite;
      const benchmarks = suiteResult.benchmarks || [];
      const passedCount = benchmarks.filter((b: any) => b.passed).length;

      console.log(`\n📊 ${suite.toUpperCase()} SUITE RESULTS`);
      console.log('─'.repeat(50));
      console.log(
        `Benchmarks: ${benchmarks.length} | Passed: ${passedCount} | Failed: ${benchmarks.length - passedCount}`
      );

      if (this.options.verbose) {
        console.log('\nDetailed Results:');
        for (const benchmark of benchmarks) {
          const status = benchmark.passed ? '✅' : '❌';
          console.log(`  ${status} ${benchmark.name}`);
          console.log(`    Duration: ${this.formatDuration(benchmark.duration)}`);
          console.log(`    Throughput: ${benchmark.throughput.toFixed(2)} ops/sec`);
          console.log(`    Memory: ${benchmark.results.memoryPeak}MB`);
          if (benchmark.errorCount > 0) {
            console.log(`    Errors: ${benchmark.errorCount}`);
          }
        }
      } else {
        // Summary table
        console.log('\nBenchmark\t\t\tStatus\tDuration\tThroughput');
        console.log('-'.repeat(70));
        for (const benchmark of benchmarks) {
          const status = benchmark.passed ? '✅' : '❌';
          const name = benchmark.name.padEnd(25);
          const duration = this.formatDuration(benchmark.duration).padEnd(10);
          const throughput = `${benchmark.throughput.toFixed(1)} ops/sec`;
          console.log(`${name}\t${status}\t${duration}\t${throughput}`);
        }
      }

      // Recommendations
      if (suiteResult.summary?.recommendations?.length > 0) {
        console.log('\n💡 Recommendations:');
        for (const recommendation of suiteResult.summary.recommendations) {
          console.log(`  • ${recommendation}`);
        }
      }
    }

    // Overall summary
    console.log('\n📈 OVERALL SUMMARY');
    console.log('─'.repeat(50));
    const totalBenchmarks = results.reduce((sum, r) => sum + (r.benchmarks?.length || 0), 0);
    const totalPassed = results.reduce(
      (sum, r) => sum + (r.benchmarks?.filter((b: any) => b.passed).length || 0),
      0
    );
    const totalFailed = totalBenchmarks - totalPassed;

    console.log(`Total Benchmarks: ${totalBenchmarks}`);
    console.log(`Passed: ${totalPassed} (${((totalPassed / totalBenchmarks) * 100).toFixed(1)}%)`);
    console.log(`Failed: ${totalFailed} (${((totalFailed / totalBenchmarks) * 100).toFixed(1)}%)`);
    console.log(`Total Duration: ${this.formatDuration(totalDuration)}`);
  }

  private async outputJSON(results: any[], totalDuration: number): Promise<void> {
    const output = {
      timestamp: new Date().toISOString(),
      totalDuration,
      options: this.options,
      results,
      summary: {
        totalBenchmarks: results.reduce((sum, r) => sum + (r.benchmarks?.length || 0), 0),
        totalPassed: results.reduce(
          (sum, r) => sum + (r.benchmarks?.filter((b: any) => b.passed).length || 0),
          0
        ),
        overallHealth: results.every((r) => r.summary?.overallPassed !== false)
          ? 'healthy'
          : 'degraded',
      },
    };

    console.log(JSON.stringify(output, null, 2));
  }

  private async outputMarkdown(results: any[], totalDuration: number): Promise<void> {
    let markdown = '# Performance Benchmark Results\n\n';
    markdown += `**Timestamp:** ${new Date().toISOString()}\n`;
    markdown += `**Total Duration:** ${this.formatDuration(totalDuration)}\n\n`;

    for (const suiteResult of results) {
      const suite = suiteResult.suite;
      const benchmarks = suiteResult.benchmarks || [];

      markdown += `## ${suite.charAt(0).toUpperCase() + suite.slice(1)} Suite\n\n`;

      markdown += '| Benchmark | Status | Duration | Throughput | Memory |\n';
      markdown += '|-----------|--------|----------|------------|--------|\n';

      for (const benchmark of benchmarks) {
        const status = benchmark.passed ? '✅' : '❌';
        const duration = this.formatDuration(benchmark.duration);
        const throughput = `${benchmark.throughput.toFixed(1)} ops/sec`;
        const memory = `${benchmark.results.memoryPeak}MB`;

        markdown += `| ${benchmark.name} | ${status} | ${duration} | ${throughput} | ${memory} |\n`;
      }

      if (suiteResult.summary?.recommendations?.length > 0) {
        markdown += '\n### Recommendations\n\n';
        for (const recommendation of suiteResult.summary.recommendations) {
          markdown += `- ${recommendation}\n`;
        }
      }

      markdown += '\n';
    }

    console.log(markdown);
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${Math.round(ms)}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  }
}

// Parse command line arguments
function parseArgs(): BenchmarkOptions {
  const args = process.argv.slice(2);
  const options: BenchmarkOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--suite':
      case '-s':
        options.suite = args[++i] as any;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--iterations':
      case '-i':
        options.iterations = parseInt(args[++i]);
        break;
      case '--output':
      case '-o':
        options.output = args[++i] as any;
        break;
      case '--help':
      case '-h':
        console.log(`
Performance Benchmark Runner

Usage: npm run benchmark:performance [options]

Options:
  --suite, -s <suite>       Run specific suite: clustering, embeddings, database, integration, all (default: all)
  --verbose, -v            Show detailed results
  --iterations, -i <n>     Run benchmarks n times and average results (default: 1)
  --output, -o <format>    Output format: console, json, markdown (default: console)
  --help, -h               Show this help message

Examples:
  npm run benchmark:performance --suite clustering --verbose
  npm run benchmark:performance --iterations 3 --output json
  npm run benchmark:performance --suite all --output markdown
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

// Main execution
async function main() {
  const options = parseArgs();
  const runner = new BenchmarkRunner(options);
  await runner.run();
}

if (require.main === module) {
  main().catch(console.error);
}
