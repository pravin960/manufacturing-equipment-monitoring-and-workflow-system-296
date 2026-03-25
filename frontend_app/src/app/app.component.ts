import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
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

  constructor(
    private readonly alertsApi: AlertsApiService,
    private readonly realtime: RealtimeAlertsService
  ) {}

  async ngOnInit(): Promise<void> {
    // Load stored alerts first (requirement #4)
    const stored = await this.alertsApi.listAlerts({ limit: 200, offset: 0 });
    this.alerts = stored.map((a) => this.mapStoredAlert(a));

    // Subscribe to real-time events (requirement #3)
    this.sub = this.realtime.onNewAlert().subscribe((payload) => {
      console.log('[ui] new_alert received:', payload);
      this.alerts = [this.mapRealtimeAlert(payload), ...this.alerts].slice(0, 200);
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
}
