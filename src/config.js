'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { writeJson } = require('./utils');

const DEFAULT_CONFIG_PATH = path.resolve(__dirname, '../.claude/config.json');
const DEFAULT_CONFIG_TEMPLATE_PATH = path.resolve(__dirname, '../.claude/config.example.json');

function resolveConfigPath(configPath) {
  return path.resolve(configPath || DEFAULT_CONFIG_PATH);
}

function resolveConfigValue(configPath, value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error('Los valores del archivo de configuración deben ser texto.');
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return path.resolve(path.dirname(configPath), value);
}

function loadCliConfig(configPath) {
  const resolvedConfigPath = resolveConfigPath(configPath);
  if (!fs.existsSync(resolvedConfigPath)) {
    return {};
  }

  const loaded = JSON.parse(fs.readFileSync(resolvedConfigPath, 'utf8'));
  if (!loaded || typeof loaded !== 'object' || Array.isArray(loaded)) {
    throw new Error('El archivo de configuración local debe ser un objeto JSON.');
  }

  return {
    mode: loaded.mode,
    jobsPath: resolveConfigValue(resolvedConfigPath, loaded.jobsPath),
    profilePath: resolveConfigValue(resolvedConfigPath, loaded.profilePath),
    statePath: resolveConfigValue(resolvedConfigPath, loaded.statePath),
    baseUrl: loaded.baseUrl,
    token: loaded.token
  };
}

function initConfigFile(configPath) {
  const resolvedConfigPath = resolveConfigPath(configPath);
  if (fs.existsSync(resolvedConfigPath)) {
    return resolvedConfigPath;
  }

  const templatePath = resolveConfigPath(DEFAULT_CONFIG_TEMPLATE_PATH);
  const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
  writeJson(resolvedConfigPath, template);
  return resolvedConfigPath;
}

module.exports = {
  DEFAULT_CONFIG_PATH,
  DEFAULT_CONFIG_TEMPLATE_PATH,
  initConfigFile,
  loadCliConfig,
  resolveConfigPath
};
