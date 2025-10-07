/**
 * Alert System for API Monitoring and Notifications
 * Handles quota warnings, security alerts, and system notifications
 */

// Types for alert system
export interface Alert {
  id: string;
  type: 'quota_warning' | 'rate_limit' | 'api_error' | 'security' | 'performance' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  service: string;
  title: string;
  message: string;
  created_at: Date;
  resolved_at?: Date;
  acknowledged_at?: Date;
  metadata?: Record<string, any>;
  actions?: AlertAction[];
}

export interface AlertAction {
  type: 'url' | 'command' | 'email';
  label: string;
  value: string;
  urgent?: boolean;
}

export interface AlertRule {
  id: string;
  service: string;
  metric: 'quota_usage' | 'rate_limit_hits' | 'error_rate' | 'response_time';
  threshold: number;
  comparison: 'gt' | 'lt' | 'eq';
  window_minutes: number;
  severity: Alert['severity'];
  cooldown_minutes: number;
  enabled: boolean;
}

export interface NotificationChannel {
  type: 'console' | 'email' | 'webhook' | 'slack';
  enabled: boolean;
  config: Record<string, any>;
  severity_filter: Alert['severity'][];
}

// Configuration from environment
const ENABLE_ALERTS = process.env.ENABLE_API_ALERTS !== 'false';
const ALERT_COOLDOWN_MINUTES = parseInt(process.env.ALERT_COOLDOWN_MINUTES || '15');
const MAX_ALERTS_STORED = parseInt(process.env.MAX_ALERTS_STORED || '1000');

// Default alert rules
const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'openai_quota_high',
    service: 'openai',
    metric: 'quota_usage',
    threshold: 80,
    comparison: 'gt',
    window_minutes: 60,
    severity: 'medium',
    cooldown_minutes: 60,
    enabled: true,
  },
  {
    id: 'openai_quota_critical',
    service: 'openai',
    metric: 'quota_usage',
    threshold: 95,
    comparison: 'gt',
    window_minutes: 60,
    severity: 'critical',
    cooldown_minutes: 30,
    enabled: true,
  },
  {
    id: 'openai_rate_limit',
    service: 'openai',
    metric: 'rate_limit_hits',
    threshold: 5,
    comparison: 'gt',
    window_minutes: 10,
    severity: 'high',
    cooldown_minutes: 30,
    enabled: true,
  },
  {
    id: 'google_analytics_quota',
    service: 'google_analytics',
    metric: 'quota_usage',
    threshold: 85,
    comparison: 'gt',
    window_minutes: 1440, // 24 hours
    severity: 'medium',
    cooldown_minutes: 240,
    enabled: true,
  },
  {
    id: 'api_error_rate',
    service: 'all',
    metric: 'error_rate',
    threshold: 10,
    comparison: 'gt',
    window_minutes: 15,
    severity: 'high',
    cooldown_minutes: 30,
    enabled: true,
  },
];

// Alert storage and management
class AlertManager {
  private alerts: Map<string, Alert> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private channels: NotificationChannel[] = [];
  private lastTriggered: Map<string, Date> = new Map();

  constructor() {
    this.initializeDefaultRules();
    this.setupDefaultChannels();

    if (ENABLE_ALERTS) {
      console.log('🔔 Alert system initialized');
      console.log(`   - Rules: ${this.rules.size}`);
      console.log(`   - Channels: ${this.channels.filter((c) => c.enabled).length}`);
    }
  }

  private initializeDefaultRules(): void {
    DEFAULT_ALERT_RULES.forEach((rule) => {
      this.rules.set(rule.id, rule);
    });
  }

  private setupDefaultChannels(): void {
    // Console channel (always enabled for development)
    this.channels.push({
      type: 'console',
      enabled: true,
      config: {},
      severity_filter: ['low', 'medium', 'high', 'critical'],
    });

    // Email channel (if configured)
    if (process.env.ALERT_EMAIL_TO && process.env.RESEND_API_KEY) {
      this.channels.push({
        type: 'email',
        enabled: true,
        config: {
          to: process.env.ALERT_EMAIL_TO,
          from: process.env.EMAIL_FROM || 'alerts@llmtxtmastery.com',
          api_key: process.env.RESEND_API_KEY,
        },
        severity_filter: ['high', 'critical'],
      });
    }

    // Webhook channel (if configured)
    if (process.env.ALERT_WEBHOOK_URL) {
      this.channels.push({
        type: 'webhook',
        enabled: true,
        config: {
          url: process.env.ALERT_WEBHOOK_URL,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: process.env.ALERT_WEBHOOK_TOKEN
              ? `Bearer ${process.env.ALERT_WEBHOOK_TOKEN}`
              : undefined,
          },
        },
        severity_filter: ['medium', 'high', 'critical'],
      });
    }
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private checkCooldown(ruleId: string, cooldownMinutes: number): boolean {
    const lastTime = this.lastTriggered.get(ruleId);
    if (!lastTime) return false;

    const cooldownMs = cooldownMinutes * 60 * 1000;
    return Date.now() - lastTime.getTime() < cooldownMs;
  }

  /**
   * Create and trigger an alert
   */
  createAlert(alertData: Omit<Alert, 'id' | 'created_at'>): string {
    if (!ENABLE_ALERTS) return '';

    const alertId = this.generateAlertId();
    const alert: Alert = {
      ...alertData,
      id: alertId,
      created_at: new Date(),
    };

    // Store alert
    this.alerts.set(alertId, alert);

    // Trim old alerts if needed
    if (this.alerts.size > MAX_ALERTS_STORED) {
      const oldestId = Array.from(this.alerts.keys())[0];
      this.alerts.delete(oldestId);
    }

    // Send notifications
    this.sendNotifications(alert);

    console.log(`[Alert] Created ${alert.severity} alert: ${alert.title}`);
    return alertId;
  }

  /**
   * Check metric against rules and trigger alerts
   */
  checkMetric(
    service: string,
    metric: AlertRule['metric'],
    value: number,
    metadata?: Record<string, any>
  ): void {
    if (!ENABLE_ALERTS) return;

    const relevantRules = Array.from(this.rules.values()).filter(
      (rule) =>
        rule.enabled &&
        (rule.service === service || rule.service === 'all') &&
        rule.metric === metric
    );

    for (const rule of relevantRules) {
      // Check cooldown
      if (this.checkCooldown(rule.id, rule.cooldown_minutes)) {
        continue;
      }

      // Check threshold
      const triggered = this.evaluateThreshold(value, rule.threshold, rule.comparison);

      if (triggered) {
        this.triggerRule(rule, value, metadata);
        this.lastTriggered.set(rule.id, new Date());
      }
    }
  }

  private evaluateThreshold(
    value: number,
    threshold: number,
    comparison: AlertRule['comparison']
  ): boolean {
    switch (comparison) {
      case 'gt':
        return value > threshold;
      case 'lt':
        return value < threshold;
      case 'eq':
        return value === threshold;
      default:
        return false;
    }
  }

  private triggerRule(rule: AlertRule, value: number, metadata?: Record<string, any>): void {
    const actions: AlertAction[] = [];

    // Add relevant actions based on rule type
    if (rule.metric === 'quota_usage' && rule.severity === 'critical') {
      actions.push({
        type: 'url',
        label: 'View Usage Dashboard',
        value: '/admin/api-usage',
        urgent: true,
      });
    }

    if (rule.service === 'openai' && rule.metric === 'rate_limit_hits') {
      actions.push({
        type: 'command',
        label: 'Reduce Request Rate',
        value: 'implement exponential backoff',
      });
    }

    const alert = this.createAlert({
      type:
        rule.metric === 'quota_usage'
          ? 'quota_warning'
          : rule.metric === 'rate_limit_hits'
            ? 'rate_limit'
            : rule.metric === 'error_rate'
              ? 'api_error'
              : 'system',
      severity: rule.severity,
      service: rule.service,
      title: this.generateAlertTitle(rule, value),
      message: this.generateAlertMessage(rule, value),
      metadata: { rule_id: rule.id, value, threshold: rule.threshold, ...metadata },
      actions,
    });
  }

  private generateAlertTitle(rule: AlertRule, value: number): string {
    const serviceName = rule.service.replace('_', ' ').toUpperCase();
    const metricName = rule.metric.replace('_', ' ');

    switch (rule.metric) {
      case 'quota_usage':
        return `${serviceName} Quota Usage High (${value}%)`;
      case 'rate_limit_hits':
        return `${serviceName} Rate Limit Exceeded`;
      case 'error_rate':
        return `${serviceName} Error Rate High (${value}%)`;
      default:
        return `${serviceName} ${metricName} Alert`;
    }
  }

  private generateAlertMessage(rule: AlertRule, value: number): string {
    const serviceName = rule.service.replace('_', ' ');

    switch (rule.metric) {
      case 'quota_usage':
        return `${serviceName} API quota usage is at ${value}%, exceeding the ${rule.threshold}% threshold. Consider reducing API calls or upgrading your plan.`;
      case 'rate_limit_hits':
        return `${serviceName} API has hit rate limits ${value} times in the last ${rule.window_minutes} minutes. Implement request throttling or increase delays between requests.`;
      case 'error_rate':
        return `${serviceName} API error rate is ${value}%, above the ${rule.threshold}% threshold. Check API health and error logs.`;
      default:
        return `${serviceName} metric ${rule.metric} value ${value} exceeds threshold ${rule.threshold}.`;
    }
  }

  private async sendNotifications(alert: Alert): Promise<void> {
    const enabledChannels = this.channels.filter(
      (channel) => channel.enabled && channel.severity_filter.includes(alert.severity)
    );

    for (const channel of enabledChannels) {
      try {
        await this.sendToChannel(channel, alert);
      } catch (error) {
        console.error(`[Alert] Failed to send to ${channel.type}:`, error);
      }
    }
  }

  private async sendToChannel(channel: NotificationChannel, alert: Alert): Promise<void> {
    switch (channel.type) {
      case 'console':
        this.sendConsoleAlert(alert);
        break;
      case 'email':
        await this.sendEmailAlert(channel, alert);
        break;
      case 'webhook':
        await this.sendWebhookAlert(channel, alert);
        break;
      default:
        console.warn(`[Alert] Unknown channel type: ${channel.type}`);
    }
  }

  private sendConsoleAlert(alert: Alert): void {
    const icon = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴',
    }[alert.severity];

    const logLevel = alert.severity === 'critical' || alert.severity === 'high' ? 'error' : 'warn';

    console[logLevel](`${icon} [ALERT] ${alert.title}`);
    console[logLevel](`   Service: ${alert.service}`);
    console[logLevel](`   Message: ${alert.message}`);

    if (alert.actions && alert.actions.length > 0) {
      console[logLevel](`   Actions:`);
      alert.actions.forEach((action) => {
        console[logLevel](`     - ${action.label}: ${action.value}`);
      });
    }
  }

  private async sendEmailAlert(channel: NotificationChannel, alert: Alert): Promise<void> {
    // Email implementation would go here
    // For now, just log that we would send an email
    console.log(`[Alert] Would send email to ${channel.config.to}: ${alert.title}`);
  }

  private async sendWebhookAlert(channel: NotificationChannel, alert: Alert): Promise<void> {
    // Webhook implementation would go here
    console.log(`[Alert] Would send webhook to ${channel.config.url}: ${alert.title}`);
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .filter((alert) => !alert.resolved_at)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.acknowledged_at) {
      alert.acknowledged_at = new Date();
      return true;
    }
    return false;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.resolved_at) {
      alert.resolved_at = new Date();
      return true;
    }
    return false;
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): {
    total: number;
    active: number;
    by_severity: Record<Alert['severity'], number>;
    by_service: Record<string, number>;
    last_24h: number;
  } {
    const alerts = Array.from(this.alerts.values());
    const active = alerts.filter((a) => !a.resolved_at);
    const last24h = alerts.filter((a) => Date.now() - a.created_at.getTime() < 24 * 60 * 60 * 1000);

    const bySeverity = alerts.reduce(
      (acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
      },
      {} as Record<Alert['severity'], number>
    );

    const byService = alerts.reduce(
      (acc, alert) => {
        acc[alert.service] = (acc[alert.service] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      total: alerts.length,
      active: active.length,
      by_severity: bySeverity,
      by_service: byService,
      last_24h: last24h.length,
    };
  }

  /**
   * Test the alert system
   */
  testAlerts(): { success: boolean; message: string; alert_id?: string } {
    try {
      const testAlertId = this.createAlert({
        type: 'system',
        severity: 'low',
        service: 'alert_system',
        title: 'Alert System Test',
        message: 'This is a test alert to verify the alert system is working correctly.',
        metadata: { test: true },
      });

      return {
        success: true,
        message: 'Test alert created successfully',
        alert_id: testAlertId,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Alert system test failed: ${error.message}`,
      };
    }
  }
}

// Global alert manager instance
const alertManager = new AlertManager();

// Export functions for easy use
export function createAlert(alertData: Omit<Alert, 'id' | 'created_at'>): string {
  return alertManager.createAlert(alertData);
}

export function checkQuota(
  service: string,
  usagePercent: number,
  metadata?: Record<string, any>
): void {
  alertManager.checkMetric(service, 'quota_usage', usagePercent, metadata);
}

export function checkRateLimit(
  service: string,
  hitCount: number,
  metadata?: Record<string, any>
): void {
  alertManager.checkMetric(service, 'rate_limit_hits', hitCount, metadata);
}

export function checkErrorRate(
  service: string,
  errorPercent: number,
  metadata?: Record<string, any>
): void {
  alertManager.checkMetric(service, 'error_rate', errorPercent, metadata);
}

export function getActiveAlerts(): Alert[] {
  return alertManager.getActiveAlerts();
}

export function getAlertStats(): ReturnType<AlertManager['getAlertStats']> {
  return alertManager.getAlertStats();
}

export function acknowledgeAlert(alertId: string): boolean {
  return alertManager.acknowledgeAlert(alertId);
}

export function resolveAlert(alertId: string): boolean {
  return alertManager.resolveAlert(alertId);
}

export function testAlertSystem(): ReturnType<AlertManager['testAlerts']> {
  return alertManager.testAlerts();
}

// Export the manager for advanced usage
export { alertManager };

if (ENABLE_ALERTS) {
  console.log('🔔 Alert System loaded');
  console.log(`   - Cooldown: ${ALERT_COOLDOWN_MINUTES} minutes`);
  console.log(`   - Max stored alerts: ${MAX_ALERTS_STORED}`);
}

// Export types
export type { Alert, AlertAction, AlertRule, NotificationChannel };
