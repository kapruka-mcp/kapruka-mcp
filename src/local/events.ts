// Copyright (c) 2026 PulseBrew (Rithik) — https://github.com/k-rithik04

export interface EventHandlers {
  onToolCall?: (tool: string, args: Record<string, unknown>) => void;
  onError?: (tool: string, error: Error) => void;
}

export class KaprukaEvents {
  private handlers: EventHandlers;

  constructor(handlers: EventHandlers = {}) {
    this.handlers = handlers;
  }

  toolCall(tool: string, args: Record<string, unknown>): void {
    this.handlers.onToolCall?.(tool, args);
  }

  error(tool: string, err: Error): void {
    this.handlers.onError?.(tool, err);
  }
}
