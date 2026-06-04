// Copyright (c) 2026 PulseBrew (Rithik) — https://github.com/k-rithik04

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorage } from '../src/storage.js';

describe('MemoryStorage', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('should store and retrieve values', () => {
    storage.set('key1', { name: 'test' });
    const result = storage.get<{ name: string }>('key1');
    expect(result).toEqual({ name: 'test' });
  });

  it('should return null for non-existent keys', () => {
    const result = storage.get('nonexistent');
    expect(result).toBeNull();
  });

  it('should delete values', () => {
    storage.set('key1', 'value1');
    storage.delete('key1');
    expect(storage.get('key1')).toBeNull();
  });

  it('should check if key exists', () => {
    storage.set('key1', 'value1');
    expect(storage.has('key1')).toBe(true);
    expect(storage.has('key2')).toBe(false);
  });

  it('should clear all values', () => {
    storage.set('key1', 'value1');
    storage.set('key2', 'value2');
    storage.clear();
    expect(storage.size()).toBe(0);
  });

  it('should return correct size', () => {
    storage.set('key1', 'value1');
    storage.set('key2', 'value2');
    expect(storage.size()).toBe(2);
  });

  it('should handle TTL expiration', async () => {
    storage.set('key1', 'value1', 100); // 100ms TTL
    expect(storage.get('key1')).toBe('value1');

    await new Promise(resolve => setTimeout(resolve, 150));

    expect(storage.get('key1')).toBeNull();
  });

  it('should overwrite existing values', () => {
    storage.set('key1', 'value1');
    storage.set('key1', 'value2');
    expect(storage.get('key1')).toBe('value2');
  });
});
