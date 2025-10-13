import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global Teardown for UAT Testing
 * Cleanup and reporting after all tests complete
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Running UAT Global Teardown...');
  
  // This is called by global setup, but can also be used standalone
  // See uat-global-setup.ts for the main teardown logic
  
  // Additional cleanup tasks can be added here
  
  // Generate HTML summary report
  const metricsFile = path.join('tests/reports', 'uat-metrics.json');
  if (fs.existsSync(metricsFile)) {
    const metrics = JSON.parse(fs.readFileSync(metricsFile, 'utf-8'));
    
    // Generate HTML summary
    const htmlReport = generateHTMLReport(metrics);
    const htmlFile = path.join('tests/reports', 'uat-summary.html');
    fs.writeFileSync(htmlFile, htmlReport);
    console.log(`📄 HTML summary report generated: ${htmlFile}`);
  }
  
  console.log('✅ Teardown complete');
}

function generateHTMLReport(metrics: any): string {
  const passRate = parseFloat(metrics.passRate || '0');
  const isPassing = passRate >= 95;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UAT Summary Report - ${metrics.runId}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            border-bottom: 3px solid ${isPassing ? '#10b981' : '#ef4444'};
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        h1 {
            margin: 0;
            color: #1f2937;
        }
        .status {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            margin-left: 20px;
            background: ${isPassing ? '#10b981' : '#ef4444'};
            color: white;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .metric {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #3b82f6;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #1f2937;
        }
        .metric-label {
            color: #6b7280;
            margin-top: 5px;
        }
        .criteria {
            margin: 30px 0;
        }
        .criteria-item {
            padding: 10px;
            margin: 5px 0;
            border-radius: 5px;
            background: #f9fafb;
            display: flex;
            align-items: center;
        }
        .criteria-item.pass {
            border-left: 4px solid #10b981;
        }
        .criteria-item.fail {
            border-left: 4px solid #ef4444;
        }
        .icon {
            margin-right: 10px;
            font-size: 1.2em;
        }
        .bugs-section {
            margin-top: 30px;
        }
        .bug-item {
            padding: 10px;
            margin: 10px 0;
            border-radius: 5px;
            background: #fef2f2;
            border-left: 4px solid #ef4444;
        }
        .timestamp {
            color: #6b7280;
            font-size: 0.9em;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>
                UAT Summary Report
                <span class="status">${isPassing ? 'PASSED' : 'FAILED'}</span>
            </h1>
            <div class="timestamp">
                Run ID: ${metrics.runId}<br>
                Environment: ${metrics.environment}<br>
                Duration: ${((metrics.duration || 0) / 1000).toFixed(2)} seconds
            </div>
        </div>
        
        <div class="metrics-grid">
            <div class="metric">
                <div class="metric-value">${metrics.totalTests || 0}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value">${metrics.passedTests || 0}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${metrics.failedTests || 0}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${passRate.toFixed(1)}%</div>
                <div class="metric-label">Pass Rate</div>
            </div>
        </div>
        
        <div class="criteria">
            <h2>Sign-off Criteria</h2>
            
            <div class="criteria-item ${passRate >= 95 ? 'pass' : 'fail'}">
                <span class="icon">${passRate >= 95 ? '✅' : '❌'}</span>
                Pass rate ≥ 95% (Current: ${passRate.toFixed(1)}%)
            </div>
            
            <div class="criteria-item ${!metrics.bugs?.some(b => b.severity === 'CRITICAL') ? 'pass' : 'fail'}">
                <span class="icon">${!metrics.bugs?.some(b => b.severity === 'CRITICAL') ? '✅' : '❌'}</span>
                No critical bugs
            </div>
            
            <div class="criteria-item ${metrics.bugs?.filter(b => b.severity === 'HIGH').length < 5 ? 'pass' : 'fail'}">
                <span class="icon">${metrics.bugs?.filter(b => b.severity === 'HIGH').length < 5 ? '✅' : '❌'}</span>
                Less than 5 high severity bugs
            </div>
            
            <div class="criteria-item ${metrics.performanceIssues?.length === 0 ? 'pass' : 'fail'}">
                <span class="icon">${metrics.performanceIssues?.length === 0 ? '✅' : '❌'}</span>
                Performance within SLA
            </div>
            
            <div class="criteria-item ${metrics.securityIssues?.length === 0 ? 'pass' : 'fail'}">
                <span class="icon">${metrics.securityIssues?.length === 0 ? '✅' : '❌'}</span>
                No security issues
            </div>
        </div>
        
        ${metrics.bugs?.length > 0 ? `
        <div class="bugs-section">
            <h2>Issues Found</h2>
            ${metrics.bugs.map(bug => `
            <div class="bug-item">
                <strong>${bug.severity}</strong>: ${bug.description}<br>
                <small>Category: ${bug.category}</small>
            </div>
            `).join('')}
        </div>
        ` : ''}
        
        <div class="footer">
            <p>Generated on ${new Date().toLocaleString()}</p>
            <p>LLM.txt Mastery - User Acceptance Testing</p>
        </div>
    </div>
</body>
</html>
  `;
}

export default globalTeardown;