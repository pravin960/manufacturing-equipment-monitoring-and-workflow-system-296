import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { AlertsApiService, AlertDto } from './services/alerts-api.service';
import { NewAlertEventPayload, RealtimeAlertsService } from './services/realtime-alerts.service';

type DashboardAlert = {
  machineId: number;
  parameter: string;
  currentValue: number;
  thresholdValue: number;
  priority: 'Critical' | 'High' | 'Medium';
  timestamp: string;
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Alerts Dashboard';
  alerts: DashboardAlert[] = [];
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
    }

    // Subscribe to real-time events
    this.sub = this.realtime.onNewAlert().subscribe((payload) => {
      console.log('[ui] new_alert received:', payload);

      const incoming = this.mapRealtimeAlert(payload);
      // De-dup against current list
      this.alerts = this.dedupAndSortNewestFirst([incoming, ...this.alerts]).slice(0, 200);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.sub = null;
  }

  trackByIndex(index: number): number {
    return index;
  }

  badgeClass(priority: DashboardAlert['priority']): string {
    switch (priority) {
      case 'Critical':
        return 'badge badge-critical';
      case 'High':
        return 'badge badge-high';
      default:
        return 'badge badge-medium';
    }
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
