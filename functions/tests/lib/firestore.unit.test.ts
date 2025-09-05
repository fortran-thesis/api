import { describe, it, expect } from '@jest/globals';
import { queryToJson, documentToJson } from '../../src/lib/firestore';

describe('firebase lib (unit)', () => {
  it('should convert a query snapshot to JSON array', () => {
    // Mock QuerySnapshot
    const mockDoc = { id: 'abc', data: () => ({ foo: 'bar' }) };
    const mockQuerySnap = { docs: [mockDoc] } as any;
    const result = queryToJson<{ foo: string }>(mockQuerySnap);
    expect(result).toEqual([{ id: 'abc', foo: 'bar' }]);
  });

  it('should convert a document snapshot to JSON object', () => {
    // Mock DocumentSnapshot
    const mockDocSnap = { id: 'xyz', data: () => ({ baz: 123 }) } as any;
    const result = documentToJson<{ baz: number }>(mockDocSnap);
    expect(result).toEqual({ id: 'xyz', baz: 123 });
  });
});