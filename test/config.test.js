'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { buildRuntimeOptions } = require('../src/cli');
const { initConfigFile, loadCliConfig } = require('../src/config');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'claude-config-'));
}

test('loadCliConfig reads editable token config file', () => {
  const dir = makeTempDir();
  const configPath = path.join(dir, 'config.json');

  fs.writeFileSync(
    configPath,
    JSON.stringify({
      mode: 'real',
      baseUrl: 'https://example.invalid',
      token: 'mi-token-local',
      statePath: './state.json',
      profilePath: '../profile.json'
    })
  );

  const config = loadCliConfig(configPath);
  assert.equal(config.mode, 'real');
  assert.equal(config.baseUrl, 'https://example.invalid');
  assert.equal(config.token, 'mi-token-local');
  assert.equal(config.statePath, path.resolve(dir, 'state.json'));
  assert.equal(config.profilePath, path.resolve(dir, '../profile.json'));
});

test('buildRuntimeOptions uses local config and allows CLI overrides', () => {
  const dir = makeTempDir();
  const configPath = path.join(dir, 'config.json');

  fs.writeFileSync(
    configPath,
    JSON.stringify({
      mode: 'real',
      baseUrl: 'https://example.invalid',
      token: 'mi-token-local'
    })
  );

  const fromConfig = buildRuntimeOptions({ config: configPath });
  assert.equal(fromConfig.mode, 'real');
  assert.equal(fromConfig.baseUrl, 'https://example.invalid');
  assert.equal(fromConfig.token, 'mi-token-local');

  const overridden = buildRuntimeOptions({
    config: configPath,
    token: 'otro-token',
    'base-url': 'https://override.invalid'
  });
  assert.equal(overridden.baseUrl, 'https://override.invalid');
  assert.equal(overridden.token, 'otro-token');
});

test('initConfigFile creates an editable local config from the example', () => {
  const dir = makeTempDir();
  const configPath = path.join(dir, 'config.json');

  const createdPath = initConfigFile(configPath);
  const created = JSON.parse(fs.readFileSync(createdPath, 'utf8'));

  assert.equal(createdPath, path.resolve(configPath));
  assert.equal(created.mode, 'real');
  assert.equal(created.token, 'tu-token-aqui');
});
