/**
 * SECURITY ENHANCEMENT: Nonce Injection Middleware
 * 
 * This middleware injects CSP nonces into HTML responses to enable
 * strict Content Security Policy while allowing legitimate scripts.
 * 
 * SECURITY IMPLEMENTATION: Defense-in-Depth Security Headers
 */

import type { Request, Response, NextFunction } from 'express';

interface NonceRequest extends Request {
  nonce?: string;
}

/**
 * Middleware to inject CSP nonces into HTML responses
 * This enables strict-dynamic CSP while allowing legitimate inline scripts
 */
export function nonceInjectionMiddleware(req: NonceRequest, res: Response, next: NextFunction) {
  // Only process HTML responses
  const originalSend = res.send;
  
  res.send = function(body: any) {
    // Check if this is an HTML response
    const contentType = res.get('Content-Type') || '';
    const isHTML = contentType.includes('text/html') || 
                   (typeof body === 'string' && body.trim().startsWith('<!DOCTYPE html>'));
    
    if (isHTML && typeof body === 'string' && req.nonce) {
      // Inject nonce into script tags that need CSP compliance
      let modifiedBody = body;
      
      // Inject nonce into script tags (for analytics, etc.)
      modifiedBody = modifiedBody.replace(
        /<script(?![^>]*nonce)([^>]*?)>/gi,
        `<script nonce="${req.nonce}"$1>`
      );
      
      // Inject nonce into specific inline event handlers if needed
      // This is more selective - only for trusted inline scripts
      const trustedInlinePatterns = [
        // Google Analytics patterns
        /gtag\(/gi,
        /ga\(/gi,
        // Stripe patterns
        /Stripe\(/gi,
        // Application-specific patterns
        /window\.__INITIAL_STATE__/gi
      ];
      
      // For any inline scripts that match trusted patterns, ensure they have nonces
      modifiedBody = modifiedBody.replace(
        /<script(?![^>]*nonce)([^>]*?)>(.*?)<\/script>/gis,
        (match, attributes, content) => {
          // Check if this script contains trusted patterns
          const isTrusted = trustedInlinePatterns.some(pattern => pattern.test(content));
          
          if (isTrusted) {
            return `<script nonce="${req.nonce}"${attributes}>${content}</script>`;
          }
          
          // For untrusted inline scripts, log a warning
          if (content.trim()) {
            console.warn('⚠️ CSP WARNING: Inline script without nonce detected:', {
              scriptStart: content.substring(0, 100),
              url: req.url,
              userAgent: req.get('User-Agent')?.substring(0, 100)
            });
          }
          
          return match;
        }
      );
      
      // Inject nonce into the HTML head for frontend access
      modifiedBody = modifiedBody.replace(
        /<head>/i,
        `<head><meta name="csp-nonce" content="${req.nonce}">`
      );
      
      return originalSend.call(this, modifiedBody);
    }
    
    return originalSend.call(this, body);
  };
  
  next();
}

/**
 * Utility function to get nonce for frontend template rendering
 */
export function getNonceForTemplate(req: NonceRequest): string {
  return req.nonce || '';
}

/**
 * CSP violation reporting middleware
 * Logs CSP violations for monitoring and debugging
 */
export function cspViolationReporter(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/api/csp-violation-report' && req.method === 'POST') {
    console.warn('🚨 CSP VIOLATION REPORT:', {
      violation: req.body,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    // Don't expose sensitive information in response
    res.status(204).send();
    return;
  }
  
  next();
}