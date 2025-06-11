/**
 * Internationalization utilities
 * 
 * This module provides utilities for internationalization and localization.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { readFileAsync } from '../../utilities';

// Track loaded locale bundles
const loadedBundles: { [key: string]: { [key: string]: string } } = {};

/**
 * Localize a string key using the current locale
 * @param key The string key to localize
 * @param defaultValue Default value if the key isn't found
 * @param args Arguments to format into the string
 */
export function localize(key: string, defaultValue?: string, ...args: string[]): string {
  const locale = vscode.env.language || 'en';
  let value = getLocaleString(locale, key);
  
  if (!value) {
    // Fallback to English if the key isn't found in the current locale
    if (locale !== 'en') {
      value = getLocaleString('en', key);
    }
    
    // Use default value if provided and key not found
    if (!value && defaultValue) {
      value = defaultValue;
    }
    
    // Last resort - use the key itself
    if (!value) {
      value = key;
    }
  }
  
  // Format with arguments if provided
  if (args.length > 0) {
    return formatString(value, args);
  }
  
  return value;
}

/**
 * Load a locale file by language code
 * @param locale The locale code (e.g., 'en', 'zh-cn')
 * @param domain Optional domain to load specific locale bundles
 */
export async function loadLocaleFile(locale: string, domain?: string): Promise<void> {
  const bundleKey = domain ? `${locale}-${domain}` : locale;
  
  // Return if already loaded
  if (loadedBundles[bundleKey]) {
    return;
  }
  
  try {
    const extensionPath = vscode.extensions.getExtension('wpilib.vscode-wpilib')?.extensionPath;
    if (!extensionPath) {
      return;
    }
    
    const localePath = path.join(extensionPath, 'locale', locale.toLowerCase());
    let localeFile: string;
    
    if (domain) {
      localeFile = path.join(localePath, `${domain}.json`);
    } else {
      localeFile = path.join(localePath, 'package.nls.json');
    }
    
    if (fs.existsSync(localeFile)) {
      const content = await readFileAsync(localeFile, 'utf8');
      loadedBundles[bundleKey] = JSON.parse(content);
    }
  } catch (err) {
    console.error(`Failed to load locale file for ${locale}`, err);
  }
}

/**
 * Get a localized string from the loaded bundles
 * @param locale The locale code
 * @param key The string key
 * @param domain Optional domain
 */
function getLocaleString(locale: string, key: string, domain?: string): string {
  const bundleKey = domain ? `${locale}-${domain}` : locale;
  const bundle = loadedBundles[bundleKey];
  
  if (bundle && bundle[key]) {
    return bundle[key];
  }
  
  return '';
}

/**
 * Format a string with arguments
 * @param format The string with {0}, {1}, etc. placeholders
 * @param args The values to insert
 */
function formatString(format: string, args: string[]): string {
  return format.replace(/{(\d+)}/g, (match, index) => {
    const argIndex = parseInt(index, 10);
    return typeof args[argIndex] !== 'undefined' ? args[argIndex] : match;
  });
}
