'use strict';

const fs = require('node:fs');
const path = require('node:path');

function resolvePath(filePath) {
  return path.resolve(filePath);
}

function ensureDirectoryForFile(filePath) {
  fs.mkdirSync(path.dirname(resolvePath(filePath)), { recursive: true });
}

function readJson(filePath) {
  const absolutePath = resolvePath(filePath);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function writeJson(filePath, value) {
  const absolutePath = resolvePath(filePath);
  ensureDirectoryForFile(absolutePath);
  fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function unique(values) {
  return [...new Set(values)];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

module.exports = {
  clamp,
  createId,
  ensureDirectoryForFile,
  normalizeText,
  readJson,
  resolvePath,
  unique,
  writeJson
};
