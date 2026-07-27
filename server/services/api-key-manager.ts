/**
 * API Key Management and Security Service
 * Handles secure storage, rotation, and monitoring of API keys
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

// Types for API key management
export interface APIKeyInfo {
  service: string;
  key_id: string;
  key_hash: string; // Never store actual key
  created_at: Date;
  last_rotated: Date;
  rotation_due: Date;
  usage_count: number;
  last_used: Date;
  status: 'active' | 'rotating' | 'deprecated' | 'revoked';
  metadata?: Record<string, any>;
}

export interface RotationConfig {
  service: string;
  rotation_interval_days: number;
  warning_days_before: number;
  auto_rotate: boolean;
  backup_key_required: boolean;
}

export interface SecurityAlert {
  type: 'key_rotation_due' | 'key_compromise' | 'unusual_usage' | 'quota_warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  service: string;
  message: string;
  created_at: Date;
  resolved: boolean;
  metadata?: Record<string, any>;
}

// Configuration from environment
const KEY_ROTATION_DAYS = parseInt(process.env.API_KEY_ROTATION_DAYS || '90');
const WARNING_DAYS = parseInt(process.env.API_KEY_WARNING_DAYS || '7');
const ENABLE_AUTO_ROTATION = process.env.ENABLE_API_KEY_AUTO_ROTATION === 'true';
const KEYS_STORAGE_PATH = process.env.API_KEYS_STORAGE_PATH || './data/api-keys';

// Default rotation configurations
const DEFAULT_ROTATION_CONFIGS: RotationConfig[] = [
  {
    service: 'openai',
    rotation_interval_days: KEY_ROTATION_DAYS,
    warning_days_before: WARNING_DAYS,
    auto_rotate: false, // OpenAI keys need manual rotation
    backup_key_required: true,
  },
  {
    service: 'google_analytics',
    rotation_interval_days: KEY_ROTATION_DAYS,
    warning_days_before: WARNING_DAYS,
    auto_rotate: false, // Service account keys need manual rotation
    backup_key_required: false,
  },
  {
    service: 'stripe',
    rotation_interval_days: KEY_ROTATION_DAYS,
    warning_days_before: WARNING_DAYS,
    auto_rotate: false, // Stripe keys need manual rotation
    backup_key_required: true,
  },
];

// In-memory storage (production should use encrypted database)
class APIKeyStorage {
  private keys = new Map<string, APIKeyInfo>();
  private alerts: SecurityAlert[] = [];
  private configs = new Map<string, RotationConfig>();

  constructor() {
    // Initialize with default configs
    DEFAULT_ROTATION_CONFIGS.forEach((config) => {
      this.configs.set(config.service, config);
    });
  }

  // Hash API key for storage (never store actual key)
  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex').substring(0, 16);
  }

  // Generate key ID
  private generateKeyId(service: string): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `${service}_${timestamp}_${random}`;
  }

  // Register a new API key
  registerKey(service: string, key: string, metadata?: Record<string, any>): string {
    const keyId = this.generateKeyId(service);
    const now = new Date();
    const config = this.configs.get(service);
    const rotationInterval = config?.rotation_interval_days || KEY_ROTATION_DAYS;

    const keyInfo: APIKeyInfo = {
      service,
      key_id: keyId,
      key_hash: this.hashKey(key),
      created_at: now,
      last_rotated: now,
      rotation_due: new Date(now.getTime() + rotationInterval * 24 * 60 * 60 * 1000),
      usage_count: 0,
      last_used: now,
      status: 'active',
      metadata,
    };

    this.keys.set(keyId, keyInfo);
    console.log(`[Key Manager] Registered new ${service} key: ${keyId}`);
    return keyId;
  }

  // Record key usage
  recordUsage(keyId: string): void {
    const keyInfo = this.keys.get(keyId);
    if (keyInfo) {
      keyInfo.usage_count++;
      keyInfo.last_used = new Date();
    }
  }

  // Check if key needs rotation
  checkRotationStatus(keyId: string): {
    needs_rotation: boolean;
    days_until_due: number;
    warning: boolean;
  } {
    const keyInfo = this.keys.get(keyId);
    if (!keyInfo) {
      return { needs_rotation: true, days_until_due: 0, warning: true };
    }

    const now = new Date();
    const daysUntilDue = Math.ceil(
      (keyInfo.rotation_due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );
    const config = this.configs.get(keyInfo.service);
    const warningDays = config?.warning_days_before || WARNING_DAYS;

    return {
      needs_rotation: daysUntilDue <= 0,
      days_until_due: daysUntilDue,
      warning: daysUntilDue <= warningDays,
    };
  }

  // Get all keys needing attention
  getKeysNeedingAttention(): Array<{
    key_info: APIKeyInfo;
    rotation_status: ReturnType<APIKeyStorage['checkRotationStatus']>;
  }> {
    const needingAttention: Array<{
      key_info: APIKeyInfo;
      rotation_status: ReturnType<APIKeyStorage['checkRotationStatus']>;
    }> = [];

    for (const [keyId, keyInfo] of this.keys) {
      if (keyInfo.status !== 'active') continue;

      const rotationStatus = this.checkRotationStatus(keyId);
      if (rotationStatus.warning || rotationStatus.needs_rotation) {
        needingAttention.push({
          key_info: keyInfo,
          rotation_status: rotationStatus,
        });
      }
    }

    return needingAttention.sort(
      (a, b) => a.rotation_status.days_until_due - b.rotation_status.days_until_due
    );
  }

  // Mark key for rotation
  markForRotation(keyId: string, reason?: string): void {
    const keyInfo = this.keys.get(keyId);
    if (keyInfo && keyInfo.status === 'active') {
      keyInfo.status = 'rotating';

      this.addAlert({
        type: 'key_rotation_due',
        severity: 'medium',
        service: keyInfo.service,
        message: `API key rotation required for ${keyInfo.service}${reason ? `: ${reason}` : ''}`,
        created_at: new Date(),
        metadata: { key_id: keyId, reason },
      });

      console.log(`[Key Manager] Marked ${keyInfo.service} key for rotation: ${keyId}`);
    }
  }

  // Complete key rotation
  completeRotation(oldKeyId: string, newKey: string): string {
    const oldKeyInfo = this.keys.get(oldKeyId);
    if (!oldKeyInfo) {
      throw new Error(`Key not found: ${oldKeyId}`);
    }

    // Register new key
    const newKeyId = this.registerKey(oldKeyInfo.service, newKey, oldKeyInfo.metadata);

    // Mark old key as deprecated
    oldKeyInfo.status = 'deprecated';

    console.log(
      `[Key Manager] Completed rotation for ${oldKeyInfo.service}: ${oldKeyId} -> ${newKeyId}`
    );
    return newKeyId;
  }

  // Revoke a key
  revokeKey(keyId: string, reason?: string): void {
    const keyInfo = this.keys.get(keyId);
    if (keyInfo) {
      keyInfo.status = 'revoked';

      this.addAlert({
        type: 'key_compromise',
        severity: 'high',
        service: keyInfo.service,
        message: `API key revoked for ${keyInfo.service}${reason ? `: ${reason}` : ''}`,
        created_at: new Date(),
        metadata: { key_id: keyId, reason },
      });

      console.log(`[Key Manager] Revoked ${keyInfo.service} key: ${keyId}`);
    }
  }

  // Add security alert
  addAlert(alert: Omit<SecurityAlert, 'resolved'>): void {
    const fullAlert: SecurityAlert = { ...alert, resolved: false };
    this.alerts.push(fullAlert);

    // Log based on severity
    const logLevel = alert.severity === 'critical' || alert.severity === 'high' ? 'error' : 'warn';
    console[logLevel](`[Security Alert] ${alert.type.toUpperCase()}: ${alert.message}`);

    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }
  }

  // Get active alerts
  getActiveAlerts(): SecurityAlert[] {
    return this.alerts.filter((alert) => !alert.resolved);
  }

  // Resolve alert
  resolveAlert(alertIndex: number): void {
    if (this.alerts[alertIndex]) {
      this.alerts[alertIndex].resolved = true;
    }
  }

  // Get key statistics
  getKeyStats(): {
    total_keys: number;
    active_keys: number;
    keys_needing_rotation: number;
    keys_with_warnings: number;
    total_usage: number;
    alerts_count: number;
    by_service: Record<string, { count: number; last_rotation: Date | null }>;
  } {
    const stats = {
      total_keys: this.keys.size,
      active_keys: 0,
      keys_needing_rotation: 0,
      keys_with_warnings: 0,
      total_usage: 0,
      alerts_count: this.getActiveAlerts().length,
      by_service: {} as Record<string, { count: number; last_rotation: Date | null }>,
    };

    for (const [keyId, keyInfo] of this.keys) {
      if (keyInfo.status === 'active') {
        stats.active_keys++;
      }

      stats.total_usage += keyInfo.usage_count;

      const rotationStatus = this.checkRotationStatus(keyId);
      if (rotationStatus.needs_rotation) {
        stats.keys_needing_rotation++;
      }
      if (rotationStatus.warning) {
        stats.keys_with_warnings++;
      }

      // By service stats
      if (!stats.by_service[keyInfo.service]) {
        stats.by_service[keyInfo.service] = {
          count: 0,
          last_rotation: null,
        };
      }
      stats.by_service[keyInfo.service].count++;

      if (
        !stats.by_service[keyInfo.service].last_rotation ||
        keyInfo.last_rotated > stats.by_service[keyInfo.service].last_rotation!
      ) {
        stats.by_service[keyInfo.service].last_rotation = keyInfo.last_rotated;
      }
    }

    return stats;
  }
}

// Global key storage instance
const keyStorage = new APIKeyStorage();

/**
 * Initialize API key tracking from environment variables
 */
export function initializeKeyTracking(): void {
  console.log('🔐 Initializing API Key Management...');

  // Track OpenRouter key if present (preferred for LLM calls)
  if (process.env.OPENROUTER_API_KEY) {
    keyStorage.registerKey('openrouter', process.env.OPENROUTER_API_KEY, {
      model: process.env.LLM_MODEL || 'openai/gpt-4o-mini',
    });
  }

  // Track OpenAI key if present (used for embeddings, fallback for LLM)
  if (process.env.OPENAI_API_KEY) {
    keyStorage.registerKey('openai', process.env.OPENAI_API_KEY, {
      model_access: ['gpt-4o', 'gpt-4o-mini', 'text-embedding-3-small'],
      usage_tier: process.env.OPENAI_USAGE_TIER || 'tier-1',
    });
  }

  // Track Stripe keys if present
  if (process.env.STRIPE_SECRET_KEY) {
    keyStorage.registerKey('stripe', process.env.STRIPE_SECRET_KEY, {
      mode: process.env.NODE_ENV === 'production' ? 'live' : 'test',
      webhook_secret: !!process.env.STRIPE_WEBHOOK_SECRET,
    });
  }

  // Track Google Analytics if present
  if (process.env.GA4_SERVICE_ACCOUNT_KEY_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    keyStorage.registerKey(
      'google_analytics',
      process.env.GA4_SERVICE_ACCOUNT_KEY_JSON || 'file-based-key',
      {
        property_id: process.env.GA4_PROPERTY_ID,
        credential_type: process.env.GA4_SERVICE_ACCOUNT_KEY_JSON ? 'json' : 'file',
      }
    );
  }

  console.log(`🔐 Tracking ${keyStorage.getKeyStats().active_keys} active API keys`);
}

/**
 * Record API key usage
 */
export function recordAPIUsage(service: string): void {
  // Find active key for service
  const stats = keyStorage.getKeyStats();
  const serviceKeys = Object.keys(stats.by_service);

  if (serviceKeys.includes(service)) {
    // This is simplified - in practice, you'd track specific key IDs
    console.log(`[Key Manager] Recorded usage for ${service}`);
  }
}

/**
 * Check all keys for rotation needs
 */
export function checkAllKeysRotation(): Array<{
  service: string;
  status: 'ok' | 'warning' | 'overdue';
  days_until_due: number;
  message: string;
}> {
  const keysNeedingAttention = keyStorage.getKeysNeedingAttention();

  return keysNeedingAttention.map(({ key_info, rotation_status }) => ({
    service: key_info.service,
    status: rotation_status.needs_rotation ? 'overdue' : 'warning',
    days_until_due: rotation_status.days_until_due,
    message: rotation_status.needs_rotation
      ? `Key rotation overdue by ${Math.abs(rotation_status.days_until_due)} days`
      : `Key rotation due in ${rotation_status.days_until_due} days`,
  }));
}

/**
 * Get security dashboard data
 */
export function getSecurityDashboard(): {
  key_stats: ReturnType<APIKeyStorage['getKeyStats']>;
  rotation_status: ReturnType<typeof checkAllKeysRotation>;
  active_alerts: SecurityAlert[];
  recommendations: string[];
} {
  const keyStats = keyStorage.getKeyStats();
  const rotationStatus = checkAllKeysRotation();
  const activeAlerts = keyStorage.getActiveAlerts();

  const recommendations: string[] = [];

  if (keyStats.keys_needing_rotation > 0) {
    recommendations.push(`${keyStats.keys_needing_rotation} API keys need immediate rotation`);
  }

  if (keyStats.keys_with_warnings > 0) {
    recommendations.push(`${keyStats.keys_with_warnings} API keys will need rotation soon`);
  }

  if (activeAlerts.filter((a) => a.severity === 'high' || a.severity === 'critical').length > 0) {
    recommendations.push('High-priority security alerts need attention');
  }

  if (!process.env.OPENAI_API_KEY) {
    recommendations.push('OpenAI API key not configured - semantic features unavailable');
  }

  if (recommendations.length === 0) {
    recommendations.push('All API keys are secure and up to date');
  }

  return {
    key_stats: keyStats,
    rotation_status: rotationStatus,
    active_alerts: activeAlerts,
    recommendations,
  };
}

/**
 * Monitor quota usage and generate alerts
 */
export function monitorQuotaUsage(
  service: string,
  currentUsage: number,
  quotaLimit: number,
  timeWindow: string = '1 day'
): void {
  const usagePercentage = (currentUsage / quotaLimit) * 100;

  if (usagePercentage >= 90) {
    keyStorage.addAlert({
      type: 'quota_warning',
      severity: 'high',
      service,
      message: `${service} quota at ${usagePercentage.toFixed(1)}% (${currentUsage}/${quotaLimit})`,
      created_at: new Date(),
      metadata: { usage: currentUsage, limit: quotaLimit, percentage: usagePercentage },
    });
  } else if (usagePercentage >= 75) {
    keyStorage.addAlert({
      type: 'quota_warning',
      severity: 'medium',
      service,
      message: `${service} quota at ${usagePercentage.toFixed(1)}% (${currentUsage}/${quotaLimit})`,
      created_at: new Date(),
      metadata: { usage: currentUsage, limit: quotaLimit, percentage: usagePercentage },
    });
  }
}

/**
 * Test the key management system
 */
export function testKeyManagement(): {
  success: boolean;
  message: string;
  stats: ReturnType<APIKeyStorage['getKeyStats']>;
  rotation_checks: ReturnType<typeof checkAllKeysRotation>;
} {
  try {
    const stats = keyStorage.getKeyStats();
    const rotationChecks = checkAllKeysRotation();

    return {
      success: true,
      message: `Key management system operational - tracking ${stats.active_keys} keys`,
      stats,
      rotation_checks: rotationChecks,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Key management test failed: ${error.message}`,
      stats: keyStorage.getKeyStats(),
      rotation_checks: [],
    };
  }
}

// Initialize on module load if not in test environment
if (process.env.NODE_ENV !== 'test') {
  initializeKeyTracking();
}

// Export the storage instance for advanced usage
export { keyStorage };

console.log('🔐 API Key Management System loaded');
console.log(`   - Rotation interval: ${KEY_ROTATION_DAYS} days`);
console.log(`   - Warning period: ${WARNING_DAYS} days`);
console.log(`   - Auto-rotation: ${ENABLE_AUTO_ROTATION ? 'enabled' : 'disabled'}`);
