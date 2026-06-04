// Copyright (c) 2026 PulseBrew (Rithik) — https://github.com/k-rithik04

'use client';

import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import { KaprukaClient } from './client.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KaprukaContextValue {
  client: KaprukaClient;
  sessionId: string;
}

interface KaprukaProviderProps {
  children: ReactNode;
  mode: 'rest' | 'sdk';
  baseUrl?: string;
  mcpUrl?: string;
  sessionId?: string;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const KaprukaContext = createContext<KaprukaContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function KaprukaProvider({
  children,
  mode,
  baseUrl,
  mcpUrl,
  sessionId,
}: KaprukaProviderProps): ReactNode {
  const idRef = useRef(sessionId ?? crypto.randomUUID());

  // Keep a stable client reference. Only recreate when mode/mcpUrl actually changes.
  const clientRef = useRef<KaprukaClient | null>(null);
  const prevConfigRef = useRef<{ mode: string; baseUrl?: string; mcpUrl?: string } | null>(null);

  const value = useMemo<KaprukaContextValue>(() => {
    const configChanged =
      !prevConfigRef.current ||
      prevConfigRef.current.mode !== mode ||
      prevConfigRef.current.baseUrl !== baseUrl ||
      prevConfigRef.current.mcpUrl !== mcpUrl;

    if (configChanged || !clientRef.current) {
      clientRef.current = new KaprukaClient({
        mode,
        baseUrl,
        mcpUrl,
        sessionId: idRef.current,
      });
      prevConfigRef.current = { mode, baseUrl, mcpUrl };
    }

    return { client: clientRef.current, sessionId: idRef.current };
  }, [mode, baseUrl, mcpUrl]);

  return (
    <KaprukaContext.Provider value={value}>
      {children}
    </KaprukaContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useKaprukaContext(): KaprukaContextValue {
  const ctx = useContext(KaprukaContext);
  if (!ctx) {
    throw new Error(
      'useKaprukaContext must be used within a <KaprukaProvider>. ' +
      'Wrap your component tree with <KaprukaProvider mode="rest"> or <KaprukaProvider mode="sdk">.'
    );
  }
  return ctx;
}
