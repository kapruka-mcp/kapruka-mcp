// Copyright (c) 2026 PulseBrew (Rithik) — https://github.com/k-rithik04

import { describe, it, expect } from 'vitest';
import {
  parseSearchResults,
  parseProductDetails,
  parseCategoryList,
  parseCityList,
  parseDeliveryCheck,
  parseTrackOrder,
  isMarkdownResponse,
} from '../src/sdk/markdown-parser.js';

describe('markdown-parser', () => {
  // =========================================================================
  // parseSearchResults
  // =========================================================================
  describe('parseSearchResults', () => {
    const searchMd = `## Kapruka search: "roses"
Showing 9 results (LKR)

**1. 6 Red Rose Bouquet With Elegant Wrapping**
   ID: \`FLOWERS00T2075\` · LKR 5,210 · In stock (low) · ships internationally
   [View product](https://www.kapruka.com/buyonline/6-red-rose-bouquet-with-elegan/kid/flowers00t2075)

**2. Red Heart Gift Box Arrangement With Red Roses Ferrero Rocher Cho**
   ID: \`FLOWERS00T2089\` · LKR 12,560 · In stock (low) · ships internationally
   [View product](https://www.kapruka.com/buyonline/red-heart-gift-box-arrangement/kid/flowers00t2089)

**3. Tuxedo Roses Bouquet With 25 Red Roses And 10 White Roses**
   ID: \`FLOWERS00T1995\` · LKR 14,720 · In stock (low) · ships internationally
   [View product](https://www.kapruka.com/buyonline/tuxedo-roses-bouquet-with-25-r/kid/flowers00t1995)

*More results available. Pass \`cursor="eyJ1IjoiTVRBPSIsInAiOjJ9"\` for the next page.*`;

    it('should parse product count', () => {
      const result = parseSearchResults(searchMd, 'roses');
      expect(result.total).toBe(9);
    });

    it('should parse product names', () => {
      const result = parseSearchResults(searchMd, 'roses');
      expect(result.products.length).toBe(3);
      expect(result.products[0].name).toBe('6 Red Rose Bouquet With Elegant Wrapping');
      expect(result.products[1].name).toBe('Red Heart Gift Box Arrangement With Red Roses Ferrero Rocher Cho');
    });

    it('should parse product IDs', () => {
      const result = parseSearchResults(searchMd, 'roses');
      expect(result.products[0].id).toBe('FLOWERS00T2075');
      expect(result.products[1].id).toBe('FLOWERS00T2089');
      expect(result.products[2].id).toBe('FLOWERS00T1995');
    });

    it('should parse prices', () => {
      const result = parseSearchResults(searchMd, 'roses');
      expect(result.products[0].price).toBe(5210);
      expect(result.products[1].price).toBe(12560);
    });

    it('should parse stock status', () => {
      const result = parseSearchResults(searchMd, 'roses');
      expect(result.products[0].in_stock).toBe(true);
    });

    it('should preserve query', () => {
      const result = parseSearchResults(searchMd, 'roses');
      expect(result.query).toBe('roses');
    });

    it('should extract pagination cursor', () => {
      const result = parseSearchResults(searchMd, 'roses');
      expect(result.nextCursor).toBe('eyJ1IjoiTVRBPSIsInAiOjJ9');
    });

    it('should return empty products for empty response', () => {
      const result = parseSearchResults('No results found.', 'nothing');
      expect(result.products).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // =========================================================================
  // parseProductDetails
  // =========================================================================
  describe('parseProductDetails', () => {
    const productMd = `## 6 Red Rose Bouquet With Elegant Wrapping
**ID**: \`flowers00T2075\`
**Price**: LKR 5,210
**Stock**: In stock (low)
**Category**: flowers
**Vendor**: Flowers
**Weight**: 0 lbs
**International shipping**: Yes

Elevate your romantic gestures with the 6 Red Rose Bouquet With Elegant Wrapping.

**Image**: https://www.kapruka.com/shops/flowershop/flowerImages/zooms/1770460761093_00987.jpg

[View on Kapruka](https://www.kapruka.com/buyonline/6-red-rose-bouquet-with-elegan/kid/flowers00t2075)`;

    it('should parse product name', () => {
      const result = parseProductDetails(productMd);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('6 Red Rose Bouquet With Elegant Wrapping');
    });

    it('should parse product ID', () => {
      const result = parseProductDetails(productMd);
      expect(result!.id).toBe('flowers00T2075');
    });

    it('should parse price', () => {
      const result = parseProductDetails(productMd);
      expect(result!.price).toBe(5210);
    });

    it('should parse stock status', () => {
      const result = parseProductDetails(productMd);
      expect(result!.in_stock).toBe(true);
    });

    it('should parse category', () => {
      const result = parseProductDetails(productMd);
      expect(result!.category).toBe('flowers');
    });

    it('should parse image URL', () => {
      const result = parseProductDetails(productMd);
      expect(result!.image_url).toContain('kapruka.com');
    });

    it('should return null for error text', () => {
      const result = parseProductDetails('Error (product_not_found): No product exists');
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // parseCategoryList
  // =========================================================================
  describe('parseCategoryList', () => {
    const catMd = `## Kapruka Categories

- [Automobile](https://www.kapruka.com/online/automobile)
- [Ayurvedic](https://www.kapruka.com/online/ayurvedic)
- [Bicycle](https://www.kapruka.com/online/bicycles)
- [Books](https://www.kapruka.com/online/books)
- [cakes](https://www.kapruka.com/online/cakes)
- [flowers](https://www.kapruka.com/online/flowers)`;

    it('should parse all categories', () => {
      const result = parseCategoryList(catMd);
      expect(result.length).toBe(6);
    });

    it('should parse category names', () => {
      const result = parseCategoryList(catMd);
      expect(result[0].name).toBe('Automobile');
      expect(result[4].name).toBe('cakes');
    });

    it('should extract IDs from URLs', () => {
      const result = parseCategoryList(catMd);
      expect(result[0].id).toBe('automobile');
      expect(result[4].id).toBe('cakes');
    });

    it('should store URL in description', () => {
      const result = parseCategoryList(catMd);
      expect(result[0].description).toBe('https://www.kapruka.com/online/automobile');
    });
  });

  // =========================================================================
  // parseCityList
  // =========================================================================
  describe('parseCityList', () => {
    const cityMd = `## Kapruka delivery cities (5 of 332 total)

- **Agalawatta**  _aliases: agalawatha_
- **Agunukolapelassa**  _aliases: anguna_
- **Ahangama**
- **Ahungalla**
- **Akkareipathuwa**  _aliases: akkerai oluvil oluwil_

_327 more match — refine \`query\` or raise \`limit\` to see them._`;

    it('should parse all cities', () => {
      const result = parseCityList(cityMd);
      expect(result.length).toBe(5);
    });

    it('should parse city names', () => {
      const result = parseCityList(cityMd);
      expect(result[0].name).toBe('Agalawatta');
      expect(result[2].name).toBe('Ahangama');
    });

    it('should extract IDs from first word', () => {
      const result = parseCityList(cityMd);
      expect(result[0].id).toBe('AGALAWATTA');
      expect(result[2].id).toBe('AHANGAMA');
    });
  });

  // =========================================================================
  // parseDeliveryCheck
  // =========================================================================
  describe('parseDeliveryCheck', () => {
    const deliveryAvailable = `## Delivery to Agalawatta on 2026-06-04
**Not available on this date.**
- We've scheduled your delivery for tomorrow (5 / June). Today's slots for Agalawatta are full
- Next available: **2026-06-05**
- Rate when available: LKR 1,090`;

    const deliveryNotFound = `Error (city_not_found): Unknown city 'XYZ'`;

    it('should parse unavailable delivery', () => {
      const result = parseDeliveryCheck(deliveryAvailable);
      expect(result).not.toBeNull();
      expect(result!.available).toBe(false);
    });

    it('should parse delivery fee', () => {
      const result = parseDeliveryCheck(deliveryAvailable);
      expect(result!.fee).toBe(1090);
    });

    it('should parse city name', () => {
      const result = parseDeliveryCheck(deliveryAvailable);
      expect(result!.city).toBe('Agalawatta');
    });

    it('should return null for error', () => {
      const result = parseDeliveryCheck(deliveryNotFound);
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // parseTrackOrder
  // =========================================================================
  describe('parseTrackOrder', () => {
    const trackMd = `Order KAP-ORD-2501: Status is delivered`;

    it('should parse order status', () => {
      const result = parseTrackOrder(trackMd);
      expect(result).not.toBeNull();
      expect(result!.status).toBe('delivered');
    });

    it('should parse order ID', () => {
      const result = parseTrackOrder(trackMd);
      expect(result!.id).toBe('KAP-ORD-2501');
    });

    it('should return null for order not found', () => {
      const result = parseTrackOrder('Error (order_not_found): No order exists');
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // isMarkdownResponse
  // =========================================================================
  describe('isMarkdownResponse', () => {
    it('should detect markdown headers', () => {
      expect(isMarkdownResponse('## Title')).toBe(true);
    });

    it('should detect markdown lists', () => {
      expect(isMarkdownResponse('- item 1\n- item 2')).toBe(true);
    });

    it('should detect bold text', () => {
      expect(isMarkdownResponse('**Bold text**')).toBe(true);
    });

    it('should detect error text', () => {
      expect(isMarkdownResponse('Error: something went wrong')).toBe(true);
    });

    it('should not detect JSON as markdown', () => {
      expect(isMarkdownResponse('{"key": "value"}')).toBe(false);
    });

    it('should not detect JSON array as markdown', () => {
      expect(isMarkdownResponse('[{"id": 1}]')).toBe(false);
    });
  });
});
