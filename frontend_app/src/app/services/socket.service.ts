import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl } from './api-utils';

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
     *
     * Authoritative requirement: `io(API_BASE)` where `API_BASE` is absolute and
     * rewrites `kavia.app` -> `backend.kavia.app` when running in production browser.
     */
    if (this.socket) return this.socket;

    const baseUrl = getApiBaseUrl();

    // Extra explicit log to help validate Socket.IO uses the same API_BASE as REST.
    console.log('[socket.io] API BASE:', baseUrl);

    // Socket.IO expects the server origin/base (no path).
    this.socket = io(baseUrl, {
      transports: ['websocket', 'polling'],
    });

    // Debug logs for validation/troubleshooting.
    this.socket.on('connect', () => console.log('[socket.io] connected', this.socket?.id, '->', baseUrl));
    this.socket.on('disconnect', (reason) => console.log('[socket.io] disconnected', reason));
    this.socket.on('connect_error', (err) => console.log('[socket.io] connect_error', err));

    return this.socket;
  }
}
