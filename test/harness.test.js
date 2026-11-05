import test from 'node:test';
import assert from 'node:assert/strict';
import { SCHEMA_VERSION, STORAGE_KEY } from '../js/logic/version.js';

test('harness runs and constants are stable', () => {
  assert.equal(SCHEMA_VERSION, 1);
  assert.equal(STORAGE_KEY, 'spellbeasts.v1');
});
