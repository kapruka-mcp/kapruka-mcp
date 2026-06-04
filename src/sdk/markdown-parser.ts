// Copyright (c) 2026 PulseBrew (Rithik) — https://github.com/k-rithik04

import type { Product, Category, DeliveryCity, DeliveryCheck, Order } from './types.js';

export interface ParsedSearchResult {
  products: Product[];
  total: number;
  query: string;
  nextCursor?: string;
}

function extractId(text: string): string | undefined {
  // Match both **ID**: `value` and ID: `value` formats
  const match = text.match(/\*?\*?ID\*?\*?:\s*`([^`]+)`/);
  return match ? match[1] : undefined;
}

function extractPrice(text: string): number | undefined {
  const match = text.match(/LKR\s*([\d,]+)/);
  return match ? parseInt(match[1].replace(/,/g, ''), 10) : undefined;
}

export function parseSearchResults(text: string, query: string): ParsedSearchResult {
  const products: Product[] = [];

  // Match each product block: **N. Name**\n   ID: `ID` · LKR price · Stock · shipping
  //   [View product](url)
  const productBlocks = text.split(/\*\*\d+\.\s/).slice(1);

  for (const block of productBlocks) {
    const nameMatch = block.match(/^([^*]+)\*\*/);
    const name = nameMatch ? nameMatch[1].trim() : '';

    const id = extractId(block);
    const price = extractPrice(block);
    const inStock = /In stock/i.test(block);

    const imageMatch = block.match(/\*\*Image\*\*:\s*(https?[^\s]+)/);
    const imageUrl = imageMatch ? imageMatch[1] : '';

    const linkMatch = block.match(/\[View product\]\((https?:\/\/[^)]+)\)/);
    const productUrl = linkMatch ? linkMatch[1] : '';

    // Try to extract category from URL: /buyonline/.../kid/flowers00t2075
    const catMatch = block.match(/\/kid\/([a-z]+)/i);
    const category = catMatch ? catMatch[1] : '';

    if (id) {
      products.push({
        id,
        name,
        price: price ?? 0,
        currency: 'LKR',
        image_url: imageUrl || productUrl,
        category,
        description: '',
        visual_description: '',
        in_stock: inStock,
      });
    }
  }

  // Extract total count
  const totalMatch = text.match(/Showing\s+(\d+)\s+results/);
  const total = totalMatch ? parseInt(totalMatch[1], 10) : products.length;

  // Extract cursor for pagination
  const cursorMatch = text.match(/cursor="([^"]+)"/);
  const nextCursor = cursorMatch ? cursorMatch[1] : undefined;

  return { products, total, query, nextCursor };
}

export function parseProductDetails(text: string): Product | null {
  // Check for error responses
  if (text.startsWith('Error') || text.includes('not found')) {
    return null;
  }

  const nameMatch = text.match(/^##\s+(.+)/m);
  const name = nameMatch ? nameMatch[1].trim() : '';

  const id = extractId(text);
  const price = extractPrice(text);
  const inStock = /In stock/i.test(text);

  const catMatch = text.match(/\*\*Category\*\*:\s*(.+)/);
  const category = catMatch ? catMatch[1].trim() : '';

  const vendorMatch = text.match(/\*\*Vendor\*\*:\s*(.+)/);
  const vendor = vendorMatch ? vendorMatch[1].trim() : '';

  const weightMatch = text.match(/\*\*Weight\*\*:\s*(.+)/);
  const weight = weightMatch ? weightMatch[1].trim() : '';

  const imageMatch = text.match(/\*\*Image\*\*:\s*(https?[^\s]+)/);
  const image_url = imageMatch ? imageMatch[1] : '';

  // Extract description paragraph (between metadata and Image line)
  const descMatch = text.match(/\n\n([^\n*]+)\n\n\*\*Image\*\*/);
  const description = descMatch ? descMatch[1].trim() : '';

  if (!id) return null;

  return {
    id,
    name,
    price: price ?? 0,
    currency: 'LKR',
    image_url,
    category,
    description,
    visual_description: vendor ? `Vendor: ${vendor}. Weight: ${weight}.` : '',
    in_stock: inStock,
  };
}

export function parseCategoryList(text: string): Category[] {
  const categories: Category[] = [];

  // Match: - [Name](url)
  const lines = text.match(/- \[([^\]]+)\]\(([^)]+)\)/g) || [];
  for (const line of lines) {
    const match = line.match(/- \[([^\]]+)\]\(([^)]+)\)/);
    if (match) {
      const name = match[1];
      const url = match[2];
      // Extract category ID from URL: /online/flowers -> flowers
      const idMatch = url.match(/\/online\/(.+)$/);
      const id = idMatch ? idMatch[1] : name.toLowerCase().replace(/\s+/g, '_');
      categories.push({ id, name, description: url });
    }
  }

  return categories;
}

export function parseCityList(text: string): DeliveryCity[] {
  const cities: DeliveryCity[] = [];

  // Match: - **Name**  _aliases: alias_ (or no aliases)
  const lines = text.match(/- \*\*[^*]+\*\*(?:\s+_aliases:[^_]+_)?/g) || [];
  for (const line of lines) {
    const nameMatch = line.match(/- \*\*([^*]+)\*\*/);

    if (nameMatch) {
      const name = nameMatch[1].trim();
      // Use first word of name as ID (uppercase)
      const id = name.split(/\s+/)[0].toUpperCase();

      cities.push({
        id,
        name,
        delivery_fee: 0,
        estimated_days: 1,
      });
    }
  }

  return cities;
}

export function parseDeliveryCheck(text: string): DeliveryCheck | null {
  if (text.includes('not found') || text.includes('Error')) {
    return null;
  }

  const available = !text.includes('Not available');

  const feeMatch = text.match(/LKR\s*([\d,]+)/);
  const fee = feeMatch ? parseInt(feeMatch[1].replace(/,/g, ''), 10) : 0;

  const cityMatch = text.match(/Delivery to\s+(.+?)(?:\s+on|\n)/);
  const city = cityMatch ? cityMatch[1].trim() : '';

  return {
    available,
    fee,
    estimated_days: available ? 1 : 2,
    city,
  };
}

export function parseOrderResult(text: string): Order | null {
  if (text.includes('Error') || text.includes('validation error')) {
    return null;
  }

  const idMatch = text.match(/(?:Order ID|order_id|orderId)["\s:]+([A-Z0-9-]+)/i)
    || text.match(/KAP-ORD-\d+/);
  const id = idMatch ? (idMatch[1] || idMatch[0]) : '';

  const urlMatch = text.match(/(https?:\/\/[^\s)]+checkout[^\s)]*)/i);
  const checkout_url = urlMatch ? urlMatch[1] : '';

  const totalMatch = text.match(/LKR\s*([\d,]+)/);
  const total = totalMatch ? parseInt(totalMatch[1].replace(/,/g, ''), 10) : 0;

  return {
    id,
    items: [],
    total,
    currency: 'LKR',
    checkout_url,
    status: 'pending',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3600000).toISOString(),
  };
}

export function parseTrackOrder(text: string): Order | null {
  if (text.includes('order_not_found') || text.includes('Error')) {
    return null;
  }

  const idMatch = text.match(/Order[:\s]+([A-Z0-9-]+)/i);
  const id = idMatch ? idMatch[1] : '';

  let status: Order['status'] = 'pending';
  if (/delivered/i.test(text)) status = 'delivered';
  else if (/shipped|dispatched/i.test(text)) status = 'shipped';
  else if (/processing/i.test(text)) status = 'processing';

  return {
    id,
    items: [],
    total: 0,
    currency: 'LKR',
    checkout_url: '',
    status,
    created_at: new Date().toISOString(),
    expires_at: '',
  };
}

export function isMarkdownResponse(text: string): boolean {
  // JSON starts with { or [; markdown starts with # or * or -
  const trimmed = text.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return false;
  if (trimmed.startsWith('##') || trimmed.startsWith('-') || trimmed.startsWith('**')) return true;
  if (trimmed.startsWith('Error')) return true;
  return false;
}
