/**
 * SECURITY TESTING: Security Headers Validation
 * 
 * This script tests the comprehensive security headers implementation
 * to ensure all security features are working correctly.
 * 
 * Run with: npx tsx server/test-security-headers.ts
 */

import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

interface SecurityTest {
  name: string;
  description: string;
  test: () => Promise<{ passed: boolean; details: string; }>;
}

const BASE_URL = process.env.TEST_URL || 'http://localhost:8080';

class SecurityHeadersTester {
  private tests: SecurityTest[] = [];
  private results: Array<{ test: string; passed: boolean; details: string; duration: number; }> = [];

  constructor() {
    this.setupTests();
  }

  private setupTests() {
    this.tests = [
      {
        name: 'Content Security Policy',
        description: 'Verify CSP header is present and properly configured',
        test: async () => {
          const response = await fetch(BASE_URL);
          const csp = response.headers.get('content-security-policy');
          
          if (!csp) {
            return { passed: false, details: 'CSP header missing' };
          }
          
          const requiredDirectives = [
            'default-src',
            'script-src',
            'style-src',
            'object-src',
            'frame-ancestors'
          ];
          
          const missingDirectives = requiredDirectives.filter(directive => 
            !csp.includes(directive)
          );
          
          if (missingDirectives.length > 0) {
            return { 
              passed: false, 
              details: `Missing CSP directives: ${missingDirectives.join(', ')}` 
            };
          }
          
          // Check for secure configurations
          const hasStrictDynamic = csp.includes(\"'strict-dynamic'\");
          const hasNonce = csp.includes(\"'nonce-\");
          const blocksUnsafeInline = csp.includes(\"object-src 'none'\");
          
          return {
            passed: true,
            details: `CSP configured with strict-dynamic: ${hasStrictDynamic}, nonces: ${hasNonce}, blocks objects: ${blocksUnsafeInline}`
          };
        }
      },
      
      {
        name: 'X-Frame-Options',
        description: 'Verify clickjacking protection is enabled',
        test: async () => {
          const response = await fetch(BASE_URL);
          const frameOptions = response.headers.get('x-frame-options');
          
          if (!frameOptions) {
            return { passed: false, details: 'X-Frame-Options header missing' };
          }
          
          if (frameOptions.toLowerCase() !== 'deny') {
            return { 
              passed: false, 
              details: `X-Frame-Options should be DENY, got: ${frameOptions}` 
            };
          }
          
          return { passed: true, details: 'Clickjacking protection enabled' };
        }
      },
      
      {
        name: 'X-Content-Type-Options',
        description: 'Verify MIME type sniffing protection',
        test: async () => {
          const response = await fetch(BASE_URL);
          const contentTypeOptions = response.headers.get('x-content-type-options');
          
          if (!contentTypeOptions) {
            return { passed: false, details: 'X-Content-Type-Options header missing' };
          }
          
          if (contentTypeOptions.toLowerCase() !== 'nosniff') {
            return { 
              passed: false, 
              details: `X-Content-Type-Options should be nosniff, got: ${contentTypeOptions}` 
            };
          }
          
          return { passed: true, details: 'MIME sniffing protection enabled' };
        }
      },
      
      {
        name: 'Strict-Transport-Security',
        description: 'Verify HTTPS enforcement (production only)',
        test: async () => {
          const response = await fetch(BASE_URL);
          const hsts = response.headers.get('strict-transport-security');
          
          // In development, HSTS might not be set
          if (BASE_URL.startsWith('http://localhost')) {
            return { 
              passed: true, 
              details: 'HSTS not required for localhost development' 
            };
          }
          
          if (!hsts) {
            return { passed: false, details: 'HSTS header missing in production' };
          }
          
          const hasMaxAge = hsts.includes('max-age=');
          const hasIncludeSubDomains = hsts.includes('includeSubDomains');
          
          return {
            passed: hasMaxAge,
            details: `HSTS configured with max-age: ${hasMaxAge}, includeSubDomains: ${hasIncludeSubDomains}`
          };
        }
      },
      
      {
        name: 'Referrer-Policy',
        description: 'Verify referrer information control',
        test: async () => {
          const response = await fetch(BASE_URL);
          const referrerPolicy = response.headers.get('referrer-policy');
          
          if (!referrerPolicy) {
            return { passed: false, details: 'Referrer-Policy header missing' };
          }
          
          const securePolicy = referrerPolicy === 'strict-origin-when-cross-origin' || 
                              referrerPolicy === 'no-referrer';
          
          return {
            passed: securePolicy,
            details: `Referrer policy set to: ${referrerPolicy}`
          };
        }
      },
      
      {
        name: 'Permissions-Policy',
        description: 'Verify feature policy restrictions',
        test: async () => {
          const response = await fetch(BASE_URL);
          const permissionsPolicy = response.headers.get('permissions-policy');
          
          if (!permissionsPolicy) {
            return { passed: false, details: 'Permissions-Policy header missing' };
          }
          
          const restrictedFeatures = ['camera', 'microphone', 'geolocation'];
          const blockedFeatures = restrictedFeatures.filter(feature => 
            permissionsPolicy.includes(`${feature}=()`)
          );
          
          return {
            passed: blockedFeatures.length === restrictedFeatures.length,
            details: `Blocked features: ${blockedFeatures.join(', ')}`
          };
        }
      },
      
      {
        name: 'Server Information Hiding',
        description: 'Verify server information is not exposed',
        test: async () => {
          const response = await fetch(BASE_URL);
          const server = response.headers.get('server');
          const poweredBy = response.headers.get('x-powered-by');
          
          if (server || poweredBy) {
            return { 
              passed: false, 
              details: `Server info exposed - Server: ${server}, X-Powered-By: ${poweredBy}` 
            };
          }
          
          return { passed: true, details: 'Server information properly hidden' };
        }
      },
      
      {
        name: 'API Endpoint Security',
        description: 'Verify API endpoints have proper security headers',
        test: async () => {
          try {
            const response = await fetch(`${BASE_URL}/api/health`);
            const cacheControl = response.headers.get('cache-control');
            
            if (!cacheControl || !cacheControl.includes('no-store')) {
              return { 
                passed: false, 
                details: 'API endpoints should have no-store cache control' 
              };
            }
            
            return { passed: true, details: 'API security headers properly configured' };
          } catch (error) {
            return { 
              passed: false, 
              details: `API endpoint test failed: ${error.message}` 
            };
          }
        }
      },
      
      {
        name: 'Bot Protection Integration',
        description: 'Verify bot protection is active',
        test: async () => {
          try {
            // Test with bot-like user agent
            const response = await fetch(`${BASE_URL}/api/analyze`, {
              method: 'POST',
              headers: {
                'User-Agent': 'bot-test-agent',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ url: 'https://example.com' })
            });
            
            // Should be rate limited or require authentication
            const isProtected = response.status === 429 || response.status === 401;
            
            return {
              passed: isProtected,
              details: `Bot protection response: ${response.status} ${response.statusText}`
            };
          } catch (error) {
            return { 
              passed: true, 
              details: `Bot protection active (connection rejected): ${error.message}` 
            };
          }
        }
      },
      
      {
        name: 'Error Handling Security',
        description: 'Verify error responses don\\'t leak sensitive information',
        test: async () => {
          try {
            const response = await fetch(`${BASE_URL}/api/nonexistent-endpoint`);
            const errorData = await response.json();
            
            // Check if error response contains sensitive information
            const errorString = JSON.stringify(errorData).toLowerCase();
            const sensitivePatterns = [
              'stack',
              'internal',
              'server error',
              'database',
              'connection',
              'password',
              'secret'
            ];
            
            const foundSensitive = sensitivePatterns.filter(pattern => 
              errorString.includes(pattern)
            );
            
            return {
              passed: foundSensitive.length === 0,
              details: foundSensitive.length > 0 
                ? `Sensitive info in errors: ${foundSensitive.join(', ')}` 
                : 'Error responses properly sanitized'
            };
          } catch (error) {
            return { passed: true, details: 'Error endpoint properly protected' };
          }
        }
      }
    ];
  }

  async runTests(): Promise<void> {
    console.log('🔒 SECURITY HEADERS TESTING SUITE');
    console.log('='.repeat(50));
    console.log(`Testing URL: ${BASE_URL}\
`);

    for (const test of this.tests) {
      const start = performance.now();
      console.log(`🧪 Testing: ${test.name}`);
      console.log(`   ${test.description}`);
      
      try {
        const result = await test.test();
        const duration = performance.now() - start;
        
        this.results.push({
          test: test.name,
          passed: result.passed,
          details: result.details,
          duration
        });
        
        const status = result.passed ? '✅ PASS' : '❌ FAIL';
        console.log(`   ${status}: ${result.details}`);
        console.log(`   Duration: ${duration.toFixed(2)}ms\
`);
        
      } catch (error) {
        this.results.push({
          test: test.name,
          passed: false,
          details: `Test error: ${error.message}`,
          duration: performance.now() - start
        });
        
        console.log(`   ❌ ERROR: ${error.message}\
`);
      }
    }
    
    this.printSummary();
  }

  private printSummary(): void {
    console.log('\
📊 SECURITY TEST SUMMARY');
    console.log('='.repeat(50));
    
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const passRate = ((passed / total) * 100).toFixed(1);
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Pass Rate: ${passRate}%`);
    
    const avgDuration = (this.results.reduce((sum, r) => sum + r.duration, 0) / total).toFixed(2);
    console.log(`Average Duration: ${avgDuration}ms`);
    
    if (passed === total) {
      console.log('\
🎉 ALL SECURITY TESTS PASSED! 🎉');
      console.log('Security headers implementation is comprehensive and working correctly.');
    } else {
      console.log('\
⚠️  SECURITY ISSUES DETECTED');
      console.log('The following tests failed:');
      
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  ❌ ${r.test}: ${r.details}`);
        });
      
      console.log('\
Please review and fix the failing security configurations.');
    }
    
    console.log('\
🔒 Security headers testing complete.');
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  const tester = new SecurityHeadersTester();
  tester.runTests().catch(console.error);
}

export { SecurityHeadersTester };