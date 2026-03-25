import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

/**
 * Socket.IO singleton connection service.
 * Centralizes connection creation and debug logging.
 */
@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;

  // PUBLIC_INTERFACE
  connect(): Socket {
    /**
     * Returns a connected Socket.IO client instance (singleton).
     * Adds debug logging for connect/disconnect/errors.
     */
    if (this.socket) return this.socket;

    // NOTE: backendUrl must point to the same origin/port serving Socket.IO.
    this.socket = io(environment.backendUrl, {
      transports: ['websocket', 'polling'],
    });

    // Debug logs for validation/troubleshooting.
    this.socket.on('connect', () => console.log('[socket.io] connected', this.socket?.id));
    this.socket.on('disconnect', (reason) => console.log('[socket.io] disconnected', reason));
    this.socket.on('connect_error', (err) => console.log('[socket.io] connect_error', err));

    return this.socket;
  }
}
