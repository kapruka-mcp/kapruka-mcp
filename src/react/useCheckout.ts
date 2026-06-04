// Copyright (c) 2026 PulseBrew (Rithik) — https://github.com/k-rithik04

import { useState, useCallback } from 'react';
import { useKaprukaContext } from './context.js';
import type {
  Order,
  ShippingAddress,
  ShippingValidation,
  DeliveryCheck,
  CartItem,
  OrderRecipient,
  OrderDelivery,
  OrderSender,
} from '../sdk/types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseCheckoutParams {
  cartItems: CartItem[];
}

export interface UseCheckoutResult {
  createOrder: (params: {
    recipient: OrderRecipient;
    delivery: OrderDelivery;
    sender: OrderSender;
    giftMessage?: string;
  }) => Promise<Order>;
  trackOrder: (orderNumber: string) => Promise<Order>;
  validateShipping: (address: ShippingAddress) => Promise<ShippingValidation>;
  checkDelivery: (city: string, productId: string) => Promise<DeliveryCheck>;
  order: Order | null;
  isCreating: boolean;
  isTracking: boolean;
  error: string | null;
  lastOrderNumber: string | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCheckout({ cartItems }: UseCheckoutParams): UseCheckoutResult {
  const { client } = useKaprukaContext();

  const [order, setOrder] = useState<Order | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null);

  const createOrder = useCallback(
    async (params: {
      recipient: OrderRecipient;
      delivery: OrderDelivery;
      sender: OrderSender;
      giftMessage?: string;
    }): Promise<Order> => {
      setIsCreating(true);
      setError(null);

      try {
        const request = {
          cart: cartItems.map(i => ({
            product_id: i.productId,
            quantity: i.quantity,
          })),
          recipient: params.recipient,
          delivery: params.delivery,
          sender: params.sender,
          ...(params.giftMessage ? { gift_message: params.giftMessage } : {}),
        };

        const result = await client.createOrder(request);
        setOrder(result);
        setLastOrderNumber(result.id);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create order';
        setError(message);
        throw Object.assign(new Error(message), { cause: err });
      } finally {
        setIsCreating(false);
      }
    },
    [client, cartItems]
  );

  const trackOrder = useCallback(
    async (orderNumber: string): Promise<Order> => {
      setIsTracking(true);
      setError(null);

      try {
        const result = await client.trackOrder(orderNumber);
        setOrder(result);
        setLastOrderNumber(orderNumber);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to track order';
        setError(message);
        throw Object.assign(new Error(message), { cause: err });
      } finally {
        setIsTracking(false);
      }
    },
    [client]
  );

  const validateShipping = useCallback(
    async (address: ShippingAddress): Promise<ShippingValidation> => {
      setError(null);
      try {
        return await client.validateShipping(address);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to validate shipping';
        setError(message);
        throw Object.assign(new Error(message), { cause: err });
      }
    },
    [client]
  );

  const checkDelivery = useCallback(
    async (city: string, productId: string): Promise<DeliveryCheck> => {
      setError(null);
      try {
        return await client.checkDelivery(city, productId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to check delivery';
        setError(message);
        throw Object.assign(new Error(message), { cause: err });
      }
    },
    [client]
  );

  return {
    createOrder,
    trackOrder,
    validateShipping,
    checkDelivery,
    order,
    isCreating,
    isTracking,
    error,
    lastOrderNumber,
  };
}
