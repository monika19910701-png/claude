import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../src/worker.mjs';

test('worker health endpoint returns ok status', async () => {
  const response = handleRequest(new Request('https://example.com/health'));
  assert.equal(response.status, 200);

  const json = await response.json();
  assert.deepEqual(json, { ok: true, service: 'claude' });
});

test('worker root endpoint returns service metadata', async () => {
  const response = handleRequest(new Request('https://example.com/'));
  assert.equal(response.status, 200);

  const json = await response.json();
  assert.equal(json.service, 'claude');
  assert.equal(json.mode, 'cloudflare-worker');
  assert.ok(json.endpoints['/health']);
});
