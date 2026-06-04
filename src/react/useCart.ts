// Copyright (c) 2026 PulseBrew (Rithik) — https://github.com/k-rithik04

import { useState, useEffect, useCallback, useRef } from 'react';
import { useKaprukaContext } from './context.js';
import type { CartItem, Product } from '../sdk/types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseCartResult {
  items: CartItem[];
  total: number;
  itemCount: number;
  addItem: (product: Product, quantity?: number) => Promise<void>;
  addItems: (items: Array<{ productId: string; name: string; price: number; quantity?: number }>) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

function computeItemCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

function cloneCart(items: CartItem[]): CartItem[] {
  return items.map(i => ({ ...i }));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCart(): UseCartResult {
  const { client } = useKaprukaContext();

  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prevent stale closure issues with items
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const cart = await client.getCart();
      setItems(cart);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cart');
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  // Load cart on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (product: Product, quantity: number = 1) => {
      setIsLoading(true);
      setError(null);
      try {
        const cart = await client.addToCart({
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity,
        });
        setItems(cart);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add item');
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const addItems = useCallback(
    async (newItems: Array<{ productId: string; name: string; price: number; quantity?: number }>) => {
      setIsLoading(true);
      setError(null);
      const snapshot = cloneCart(itemsRef.current);
      try {
        let cart = itemsRef.current;
        for (const item of newItems) {
          cart = await client.addToCart({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity ?? 1,
          });
        }
        setItems(cart);
      } catch (err) {
        // Rollback: restore snapshot and re-fetch for consistency
        setItems(snapshot);
        setError(err instanceof Error ? err.message : 'Failed to add items');
        try {
          const restored = await client.getCart();
          setItems(restored);
        } catch {
          // If re-fetch also fails, snapshot is the best we have
        }
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const removeItem = useCallback(
    async (productId: string) => {
      setIsLoading(true);
      setError(null);
      const snapshot = cloneCart(itemsRef.current);
      try {
        // Fetch current cart, filter out item, re-add remaining
        const currentCart = await client.getCart();
        const remaining = currentCart.filter(i => i.productId !== productId);

        await client.clearCart();
        for (const item of remaining) {
          await client.addToCart({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          });
        }
        setItems(remaining);
      } catch (err) {
        // Rollback: restore snapshot and re-fetch
        setItems(snapshot);
        setError(err instanceof Error ? err.message : 'Failed to remove item');
        try {
          const restored = await client.getCart();
          setItems(restored);
        } catch {
          // Snapshot is best available
        }
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const updateQuantity = useCallback(
    async (productId: string, quantity: number) => {
      if (quantity <= 0) {
        return removeItem(productId);
      }

      setIsLoading(true);
      setError(null);
      const snapshot = cloneCart(itemsRef.current);
      try {
        const currentCart = await client.getCart();
        await client.clearCart();
        const newCart: CartItem[] = [];
        for (const item of currentCart) {
          const qty = item.productId === productId ? quantity : item.quantity;
          await client.addToCart({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: qty,
          });
          newCart.push({ ...item, quantity: qty });
        }
        setItems(newCart);
      } catch (err) {
        // Rollback: restore snapshot and re-fetch
        setItems(snapshot);
        setError(err instanceof Error ? err.message : 'Failed to update quantity');
        try {
          const restored = await client.getCart();
          setItems(restored);
        } catch {
          // Snapshot is best available
        }
      } finally {
        setIsLoading(false);
      }
    },
    [client, removeItem]
  );

  const clearCartFn = useCallback(
    async () => {
      setIsLoading(true);
      setError(null);
      try {
        await client.clearCart();
        setItems([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to clear cart');
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  return {
    items,
    total: computeTotal(items),
    itemCount: computeItemCount(items),
    addItem,
    addItems,
    removeItem,
    updateQuantity,
    clearCart: clearCartFn,
    isLoading,
    error,
    refresh,
  };
}
