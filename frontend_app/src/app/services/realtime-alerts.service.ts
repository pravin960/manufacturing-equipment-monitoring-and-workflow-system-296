import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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
  private socket: Socket | null = null;

  private ensureConnected(): Socket {
    if (this.socket) return this.socket;

    this.socket = io(environment.backendUrl, {
      transports: ['websocket', 'polling'],
    });

    // Debug logs to help validate realtime wiring
    this.socket.on('connect', () => console.log('[socket.io] connected', this.socket?.id));
    this.socket.on('disconnect', (reason) => console.log('[socket.io] disconnected', reason));
    this.socket.on('connect_error', (err) => console.log('[socket.io] connect_error', err));

    return this.socket;
  }

  // PUBLIC_INTERFACE
  onNewAlert(): Observable<NewAlertEventPayload> {
    /** Listen for backend "new_alert" events and emit them as an Observable. */
    const socket = this.ensureConnected();
    return new Observable<NewAlertEventPayload>((subscriber) => {
      const handler = (payload: NewAlertEventPayload) => subscriber.next(payload);
      socket.on('new_alert', handler);

      return () => {
        socket.off('new_alert', handler);
      };
    });
  }
}
