type WSEventCallback = (data: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private url: string;
  private listeners: Map<string, Set<WSEventCallback>> = new Map();
  private reconnectInterval = 3000;
  private maxReconnectAttempts = 10;
  private reconnectAttempts = 0;
  private isConnecting = false;
  private pingIntervalId: any = null;

  constructor() {
    // Dynamically resolve WebSocket address based on running environment
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = (window.location.port && window.location.port !== "8000")
      ? `${window.location.hostname}:8000`
      : window.location.host;
    this.url = `${protocol}//${host}/ws`;
  }

  public connect(): void {
    if (this.socket || this.isConnecting) return;

    this.isConnecting = true;
    console.log(`[WebSocket] Connecting to ${this.url}...`);
    
    try {
      this.socket = new WebSocket(this.url);
      
      this.socket.onopen = () => {
        console.log("[WebSocket] Connection established.");
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };
      
      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.dispatchEvent(message.event, message);
        } catch (err) {
          console.error("[WebSocket] Failed to parse message:", err);
        }
      };
      
      this.socket.onclose = () => {
        console.warn("[WebSocket] Connection closed.");
        this.socket = null;
        this.isConnecting = false;
        this.stopHeartbeat();
        this.attemptReconnect();
      };
      
      this.socket.onerror = (error) => {
        console.error("[WebSocket] Error occurred:", error);
        this.socket?.close();
      };
    } catch (error) {
      console.error("[WebSocket] Setup failed:", error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingIntervalId = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send("ping");
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[WebSocket] Max reconnect attempts reached. Please reload.");
      return;
    }
    
    this.reconnectAttempts++;
    const backoff = this.reconnectInterval * Math.min(this.reconnectAttempts, 5);
    console.log(`[WebSocket] Reconnecting in ${backoff}ms (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect();
    }, backoff);
  }

  public subscribe(event: string, callback: WSEventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
        if (eventListeners.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  private dispatchEvent(event: string, data: any): void {
    // Global listener callback
    const globalListeners = this.listeners.get("*");
    if (globalListeners) {
      globalListeners.forEach((callback) => callback(data));
    }

    // Specific event listener callback
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => callback(data));
    }
  }

  public disconnect(): void {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const wsService = new WebSocketService();
