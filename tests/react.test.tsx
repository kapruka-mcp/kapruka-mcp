// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { KaprukaProvider, useKaprukaContext } from '../src/react/context.js';
import { useKaprukaSearch } from '../src/react/useKaprukaSearch.js';
import { useCart } from '../src/react/useCart.js';
import { useCheckout } from '../src/react/useCheckout.js';
import { KaprukaClient } from '../src/react/client.js';
import type { Product, SearchResult, CartItem, Order } from '../src/sdk/types.js';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_PRODUCT: Product = {
  id: 'TEST001',
  name: 'Test Product',
  price: 1500,
  currency: 'LKR',
  image_url: 'https://example.com/img.jpg',
  category: 'cakes',
  description: 'A test product',
  visual_description: 'White box with red ribbon',
  in_stock: true,
};

const MOCK_SEARCH_RESULT: SearchResult = {
  products: [MOCK_PRODUCT],
  total: 1,
  query: 'test',
};

const MOCK_CART: CartItem[] = [
  { productId: 'TEST001', name: 'Test Product', price: 1500, quantity: 2 },
];

const MOCK_ORDER: Order = {
  id: 'ORD-001',
  items: [{ product_id: 'TEST001', product_name: 'Test Product', quantity: 2, price: 1500 }],
  total: 3000,
  currency: 'LKR',
  checkout_url: 'https://example.com/checkout',
  status: 'created',
  created_at: '2026-01-01T00:00:00Z',
  expires_at: '2026-01-01T01:00:00Z',
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetchSuccess(data: unknown, sessionId = 'test-session') {
  fetchMock.mockResolvedValueOnce({
    json: async () => ({ success: true, data, sessionId }),
  });
}

function mockFetchError(error: string, suggestion?: string) {
  fetchMock.mockResolvedValueOnce({
    json: async () => ({ success: false, data: null, sessionId: 'none', error, suggestion }),
  });
}

function createWrapper(mode: 'rest' | 'sdk' = 'rest'): React.FC<{ children: ReactNode }> {
  return ({ children }) => (
    <KaprukaProvider mode={mode} sessionId="test-session">
      {children}
    </KaprukaProvider>
  );
}

// ---------------------------------------------------------------------------
// Context tests
// ---------------------------------------------------------------------------

describe('KaprukaProvider + useKaprukaContext', () => {
  it('throws when used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useKaprukaContext());
    }).toThrow('useKaprukaContext must be used within a <KaprukaProvider>');
    consoleSpy.mockRestore();
  });

  it('provides client and sessionId', () => {
    const { result } = renderHook(() => useKaprukaContext(), {
      wrapper: createWrapper(),
    });
    expect(result.current.client).toBeInstanceOf(KaprukaClient);
    expect(result.current.sessionId).toBe('test-session');
  });
});

// ---------------------------------------------------------------------------
// useKaprukaSearch tests
// ---------------------------------------------------------------------------

describe('useKaprukaSearch', () => {
  it('returns empty results for empty query', () => {
    const { result } = renderHook(() => useKaprukaSearch(), {
      wrapper: createWrapper(),
    });
    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it('debounces search queries', async () => {
    mockFetchSuccess(MOCK_SEARCH_RESULT);

    const { result } = renderHook(() => useKaprukaSearch({ debounceMs: 50 }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setQuery('test');
    });

    expect(result.current.query).toBe('test');

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    }, { timeout: 200 });
  });

  it('calls search and returns results', async () => {
    mockFetchSuccess(MOCK_SEARCH_RESULT);

    const { result } = renderHook(() => useKaprukaSearch({ debounceMs: 0 }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.search('test');
    });

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1);
      expect(result.current.results[0].id).toBe('TEST001');
      expect(result.current.total).toBe(1);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('handles search errors', async () => {
    // search() calls setQueryState (triggers useEffect) + doSearch directly = 2 fetches
    fetchMock.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useKaprukaSearch({ debounceMs: 0 }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.search('test');
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });
  });

  it('clears results when query becomes empty', async () => {
    mockFetchSuccess(MOCK_SEARCH_RESULT);

    const { result } = renderHook(() => useKaprukaSearch({ debounceMs: 0 }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.search('test');
    });

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1);
    });

    act(() => {
      result.current.setQuery('');
    });

    await waitFor(() => {
      expect(result.current.results).toEqual([]);
      expect(result.current.total).toBe(0);
    });
  });

  it('reports hasMore correctly', async () => {
    const partial: SearchResult = {
      products: [MOCK_PRODUCT],
      total: 5,
      query: 'test',
    };
    mockFetchSuccess(partial);

    const { result } = renderHook(() => useKaprukaSearch({ debounceMs: 0, limit: 20 }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.search('test');
    });

    await waitFor(() => {
      expect(result.current.hasMore).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// useCart tests
// ---------------------------------------------------------------------------

describe('useCart', () => {
  it('loads cart on mount', async () => {
    mockFetchSuccess({ items: MOCK_CART });

    const { result } = renderHook(() => useCart(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
      expect(result.current.total).toBe(3000);
      expect(result.current.itemCount).toBe(2);
    });
  });

  it('adds item to cart', async () => {
    const updatedCart: CartItem[] = [
      ...MOCK_CART,
      { productId: 'TEST002', name: 'New Item', price: 500, quantity: 1 },
    ];

    // First load
    mockFetchSuccess({ items: MOCK_CART });
    const { result } = renderHook(() => useCart(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
    });

    // Add item: addToCart calls /api/cart/add then getCart() calls /api/cart
    mockFetchSuccess(undefined); // add response
    mockFetchSuccess({ items: updatedCart }); // getCart response
    await act(async () => {
      await result.current.addItem(
        { ...MOCK_PRODUCT, id: 'TEST002', name: 'New Item', price: 500 },
        1
      );
    });

    expect(result.current.items).toHaveLength(2);
  });

  it('clears cart', async () => {
    mockFetchSuccess({ items: MOCK_CART });
    const { result } = renderHook(() => useCart(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
    });

    // clearCart calls DELETE /api/cart
    fetchMock.mockResolvedValueOnce({ json: async () => ({ success: true, data: undefined, sessionId: 'test' }) });

    await act(async () => {
      await result.current.clearCart();
    });

    expect(result.current.items).toEqual([]);
  });

  it('handles load errors', async () => {
    mockFetchError('Network error');

    const { result } = renderHook(() => useCart(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
      expect(result.current.items).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// useCheckout tests
// ---------------------------------------------------------------------------

describe('useCheckout', () => {
  it('creates order successfully', async () => {
    // Create order
    mockFetchSuccess(MOCK_ORDER);
    const { result } = renderHook(() => useCheckout({ cartItems: MOCK_CART }), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      const order = await result.current.createOrder({
        recipient: { name: 'Test', phone: '0771234567', address: '123 Main St', city: 'Colombo' },
        delivery: { date: '2026-01-15' },
        sender: { name: 'Sender', phone: '0777654321' },
      });
      expect(order.id).toBe('ORD-001');
    });

    expect(result.current.order?.id).toBe('ORD-001');
    expect(result.current.lastOrderNumber).toBe('ORD-001');
    expect(result.current.isCreating).toBe(false);
  });

  it('tracks order successfully', async () => {
    // Track order
    mockFetchSuccess(MOCK_ORDER);
    const { result } = renderHook(() => useCheckout({ cartItems: MOCK_CART }), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.trackOrder('ORD-001');
    });

    expect(result.current.order?.id).toBe('ORD-001');
    expect(result.current.lastOrderNumber).toBe('ORD-001');
  });

  it('handles order creation errors', async () => {
    mockFetchError('Out of stock');
    const { result } = renderHook(() => useCheckout({ cartItems: MOCK_CART }), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.createOrder({
          recipient: { name: 'Test', phone: '0771234567', address: '123 Main St', city: 'Colombo' },
          delivery: { date: '2026-01-15' },
          sender: { name: 'Sender', phone: '0777654321' },
        });
      } catch {
        // expected
      }
    });

    expect(result.current.error).toBe('Out of stock');
    expect(result.current.isCreating).toBe(false);
  });

  it('validates shipping address', async () => {
    // Validate shipping
    mockFetchSuccess({ valid: true, errors: [], warnings: [] });
    const { result } = renderHook(() => useCheckout({ cartItems: MOCK_CART }), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      const validation = await result.current.validateShipping({
        name: 'Test',
        phone: '0771234567',
        address_line1: '123 Main St',
        city: 'Colombo',
      });
      expect(validation.valid).toBe(true);
    });
  });

  it('checks delivery availability', async () => {
    // Check delivery
    mockFetchSuccess({ available: true, fee: 500, estimated_days: 2, city: 'Colombo' });
    const { result } = renderHook(() => useCheckout({ cartItems: MOCK_CART }), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      const delivery = await result.current.checkDelivery('Colombo', 'TEST001');
      expect(delivery.available).toBe(true);
      expect(delivery.fee).toBe(500);
    });
  });
});

// ---------------------------------------------------------------------------
// KaprukaClient unit tests
// ---------------------------------------------------------------------------

describe('KaprukaClient — REST mode', () => {
  it('sends correct headers and body', async () => {
    mockFetchSuccess(MOCK_SEARCH_RESULT);

    const client = new KaprukaClient({ mode: 'rest', baseUrl: 'http://localhost:9999', sessionId: 's1' });

    const result = await client.searchProducts('cake');
    expect(result.products).toHaveLength(1);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:9999/api/search',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Session-ID': 's1',
        }),
        body: JSON.stringify({ q: 'cake' }),
      })
    );
  });

  it('updates sessionId from response', async () => {
    mockFetchSuccess(MOCK_SEARCH_RESULT, 'new-session');

    const client = new KaprukaClient({ mode: 'rest', sessionId: 'old' });
    await client.searchProducts('cake');

    expect(client.sessionId).toBe('new-session');
  });

  it('throws on error response', async () => {
    mockFetchError('Bad query', 'search_products');

    const client = new KaprukaClient({ mode: 'rest' });

    await expect(client.searchProducts('bad')).rejects.toThrow('Bad query');
  });

  it('calls correct REST endpoints', async () => {
    const endpoints = [
      ['/api/search', () => client.searchProducts('x')],
      ['/api/product', () => client.getProduct('X')],
      ['/api/categories', () => client.listCategories()],
      ['/api/cities', () => client.listDeliveryCities()],
      ['/api/delivery/check', () => client.checkDelivery('Colombo', 'X')],
      ['/api/order/track', () => client.trackOrder('ORD-1')],
    ];

    const client = new KaprukaClient({ mode: 'rest' });

    for (const [path, fn] of endpoints) {
      mockFetchSuccess({});
      await fn();
      const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
      expect(lastCall[0]).toContain(path);
    }
  });

  it('addToCart calls cart add then cart get', async () => {
    mockFetchSuccess(undefined); // add response
    mockFetchSuccess({ items: MOCK_CART }); // get response

    const client = new KaprukaClient({ mode: 'rest' });
    const items = await client.addToCart({
      productId: 'TEST001',
      name: 'Test',
      price: 1500,
      quantity: 1,
    });

    expect(items).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain('/api/cart/add');
    expect(fetchMock.mock.calls[1][0]).toContain('/api/cart');
  });
});
