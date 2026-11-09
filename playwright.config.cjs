module.exports = {
  testDir: './ui/testing',
  testMatch: '**/*.browser.cjs',
  workers: 1,
  use: { channel: 'chromium', headless: true },
};
