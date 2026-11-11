/**
 * Simple SSE (Server-Sent Events) emitter for real-time notifications.
 * Maintains a set of connected clients and broadcasts events to all.
 */
import type { Response } from "express";

interface SSEClient {
  id: string;
  res: Response;
}

class SSEEmitter {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Send heartbeat every 30s to prevent proxy timeouts
    this.heartbeatInterval = setInterval(() => {
      this.broadcast(":heartbeat\n\n");
    }, 30_000);
  }

  addClient(id: string, res: Response): void {
    this.clients.set(id, { id, res });

    res.on("close", () => {
      this.clients.delete(id);
    });
  }

  removeClient(id: string): void {
    this.clients.delete(id);
  }

  /** Send a named event with JSON data to all clients */
  emit(event: string, data: unknown): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    this.broadcast(payload);
  }

  private broadcast(payload: string): void {
    for (const [id, client] of this.clients) {
      try {
        client.res.write(payload);
      } catch {
        this.clients.delete(id);
      }
    }
  }

  get clientCount(): number {
    return this.clients.size;
  }

  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.clients.clear();
  }
}

// Singleton instance for message notifications
export const messageSSE = new SSEEmitter();
