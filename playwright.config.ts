import { defineConfig } from '@playwright/test';

// Core invariants run in Node, without downloading a separate browser.
export default defineConfig({ testDir: './tests', fullyParallel: false, reporter: 'list' });
