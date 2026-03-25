import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Socket } from 'socket.io-client';
import { SocketService } from './socket.service';

export interface NewAlertEventPayload {
  machineId: number;
  parameter: string;
  currentValue: number;
  thresholdValue: number;
  priority: 'Critical' | 'High' | 'Medium';
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class RealtimeAlertsService {
  constructor(private readonly socketService: SocketService) {}

  private get socket(): Socket {
    return this.socketService.connect();
  }

  // PUBLIC_INTERFACE
  onNewAlert(): Observable<NewAlertEventPayload> {
    /**
     * Listen for backend "new_alert" events and emit them as an Observable.
     * Includes debug logs to confirm payloads are received by the UI.
     */
    return new Observable<NewAlertEventPayload>((subscriber) => {
      const handler = (payload: NewAlertEventPayload) => {
        console.log('[socket.io] event new_alert', payload);
        subscriber.next(payload);
      };

      this.socket.on('new_alert', handler);

      return () => {
        this.socket.off('new_alert', handler);
      };
    });
  }
}
