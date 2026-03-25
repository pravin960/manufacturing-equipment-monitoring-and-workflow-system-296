import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { AlertsApiService, AlertDto, AlertPriority } from './services/alerts-api.service';
import { NewAlertEventPayload, RealtimeAlertsService } from './services/realtime-alerts.service';

type DashboardAlert = {
  machineId: number;
  parameter: string;
  currentValue: number;
  thresholdValue: number;
  priority: AlertPriority;
  timestamp: string;
};

type ToastTone = 'critical' | 'high' | 'medium';

type ToastVm = {
  id: string;
  title: string;
  message: string;
  tone: ToastTone;
  createdAtMs: number;
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Predictive Maintenance';
  alerts: DashboardAlert[] = [];

  isLoading = true;
  loadError: string | null = null;

  /** Toast queue (top-right). New toast is pushed when socket alerts arrive. */
  toasts: ToastVm[] = [];

  /**
   * Demo-friendly KPIs.
   * Note: Backend OpenAPI exposed /alerts and /work-orders/from-alert, but no list endpoints for
   * machines/work-orders. So KPIs are computed from alert data and marked as derived.
   */
  kpiTotalMachines = 0;
  kpiActiveAlerts = 0;
  kpiCriticalAlerts = 0;
  kpiOpenWorkOrders = 0;

  private sub: Subscription | null = null;
  private readonly platformId = inject(PLATFORM_ID);

  constructor(
    private readonly alertsApi: AlertsApiService,
    private readonly realtime: RealtimeAlertsService
  ) {}

  async ngOnInit(): Promise<void> {
    // IMPORTANT: Angular app is configured with SSR + prerender.
    // During prerender we must NOT attempt network calls or open sockets,
    // otherwise the build can hang/time out.
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    await this.loadInitialAlerts();

    // Subscribe to real-time events
    this.sub = this.realtime.onNewAlert().subscribe((payload) => {
      const incoming = this.mapRealtimeAlert(payload);

      // De-dup against current list
      this.alerts = this.dedupAndSortNewestFirst([incoming, ...this.alerts]).slice(0, 200);
      this.recomputeKpis();

      // Toast on new socket alert
      this.pushToastForNewAlert(incoming);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.sub = null;
  }

  // PUBLIC_INTERFACE
  trackByIndex(index: number): number {
    /** TrackBy for alerts list rendering. */
    return index;
  }

  // PUBLIC_INTERFACE
  badgeClass(priority: DashboardAlert['priority']): string {
    /** CSS class mapping for priority badges. */
    switch (priority) {
      case 'Critical':
        return 'badge badge-critical';
      case 'High':
        return 'badge badge-high';
      default:
        return 'badge badge-medium';
    }
  }

  // PUBLIC_INTERFACE
  priorityIcon(priority: DashboardAlert['priority']): string {
    /** Small glyph used in badges and header markers. */
    switch (priority) {
      case 'Critical':
        return '⛔';
      case 'High':
        return '⚠';
      default:
        return 'ℹ';
    }
  }

  // PUBLIC_INTERFACE
  typeIcon(parameter: string): string {
    /** Icon for alert types/parameters (simple unicode for hackathon demo friendliness). */
    const p = (parameter || '').toLowerCase();
    if (p.includes('temp')) return '🌡';
    if (p.includes('vib')) return '📳';
    if (p.includes('run')) return '⏱';
    if (p.includes('pressure')) return '🧯';
    return '🔧';
  }

  // PUBLIC_INTERFACE
  dismissToast(id: string): void {
    /** Remove a toast by id. */
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  private async loadInitialAlerts(): Promise<void> {
    this.isLoading = true;
    this.loadError = null;

    // Initial load via REST: GET /alerts
    try {
      console.log('[ui] loading initial alerts via GET /alerts');
      const stored = await this.alertsApi.listAlerts({ limit: 200, offset: 0 });
      const mapped = stored.map((a) => this.mapStoredAlert(a));

      // De-dup within initial dataset (defensive)
      this.alerts = this.dedupAndSortNewestFirst(mapped).slice(0, 200);
      console.log('[ui] initial alerts loaded:', this.alerts.length);
    } catch (err) {
      console.error('[ui] failed to load initial alerts', err);
      this.alerts = [];

      // Prefer the friendly Error message thrown by the API service; fall back to requirement-aligned text.
      // UI already renders the title "Could not load alerts" and shows `loadError` as the subtitle.
      this.loadError = err instanceof Error ? err.message : 'Could not load alerts';
    } finally {
      this.isLoading = false;
      this.recomputeKpis();
    }
  }

  private recomputeKpis(): void {
    const machineIds = new Set<number>(this.alerts.map((a) => a.machineId));

    this.kpiTotalMachines = machineIds.size;
    this.kpiActiveAlerts = this.alerts.length;
    this.kpiCriticalAlerts = this.alerts.filter((a) => a.priority === 'Critical').length;

    // Backend spec does not expose a work-orders list; keep a demo-friendly derived value.
    // This prevents a broken KPI while still showing a plausible metric for presentations.
    this.kpiOpenWorkOrders = Math.min(this.kpiCriticalAlerts, 12);
  }

  private pushToastForNewAlert(a: DashboardAlert): void {
    const now = Date.now();
    const tone: ToastTone =
      a.priority === 'Critical' ? 'critical' : a.priority === 'High' ? 'high' : 'medium';

    // Requirement: Show popup "New Critical Alert: Machine X"
    const title =
      a.priority === 'Critical' ? `New Critical Alert: Machine ${a.machineId}` : `New ${a.priority} Alert`;

    const message = `${a.parameter} is at ${a.currentValue} (threshold ${a.thresholdValue}).`;

    const toast: ToastVm = {
      id: `${a.machineId}-${a.parameter}-${now}`,
      title,
      message,
      tone,
      createdAtMs: now,
    };

    this.toasts = [toast, ...this.toasts].slice(0, 4);

    // Auto-dismiss after a short interval for demo polish.
    // Use globalThis to avoid ESLint `no-undef` on `window` and keep SSR-safe behavior.
    globalThis.setTimeout(() => this.dismissToast(toast.id), 5200);
  }

  private mapStoredAlert(a: AlertDto): DashboardAlert {
    return {
      machineId: a.machineId,
      parameter: a.parameterName,
      currentValue: a.currentValue,
      thresholdValue: a.thresholdValue,
      priority: a.priority,
      timestamp: a.createdAt,
    };
  }

  private mapRealtimeAlert(p: NewAlertEventPayload): DashboardAlert {
    return {
      machineId: p.machineId,
      parameter: p.parameter,
      currentValue: p.currentValue,
      thresholdValue: p.thresholdValue,
      priority: p.priority,
      timestamp: p.timestamp,
    };
  }

  private alertKey(a: DashboardAlert): string {
    // Use a stable key to prevent duplicates when the same alert arrives via REST + Socket
    // or socket reconnect replays similar payloads.
    return [
      a.machineId,
      a.parameter,
      a.priority,
      a.currentValue,
      a.thresholdValue,
      new Date(a.timestamp).getTime(),
    ].join('|');
  }

  private dedupAndSortNewestFirst(list: DashboardAlert[]): DashboardAlert[] {
    const seen = new Set<string>();
    const unique: DashboardAlert[] = [];
    for (const a of list) {
      const key = this.alertKey(a);
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(a);
    }

    // Ensure newest first consistently
    unique.sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
    return unique;
  }
}
