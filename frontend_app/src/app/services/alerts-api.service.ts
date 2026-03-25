import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type AlertPriority = 'Critical' | 'High' | 'Medium';

export interface AlertDto {
  id: number;
  machineId: number;
  parameterName: string;
  currentValue: number;
  thresholdValue: number;
  priority: AlertPriority;
  message: string | null;
  createdAt: string;
  acknowledged: boolean;
}

@Injectable({ providedIn: 'root' })
export class AlertsApiService {
  constructor(private readonly http: HttpClient) {}

  // PUBLIC_INTERFACE
  async listAlerts(opts?: { limit?: number; offset?: number }): Promise<AlertDto[]> {
    /** Fetch stored alerts (newest first) from the backend. */
    let params = new HttpParams();
    if (opts?.limit !== undefined) params = params.set('limit', String(opts.limit));
    if (opts?.offset !== undefined) params = params.set('offset', String(opts.offset));

    const url = `${environment.backendUrl}/alerts`;
    const res = await firstValueFrom(this.http.get<{ data: AlertDto[] }>(url, { params }));
    return res.data || [];
  }
}
