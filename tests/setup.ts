/**
 * Jest test setup
 */

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Mock child_process for MCP server tests
jest.mock('child_process', () => ({
  spawn: jest.fn(() => ({
    stdout: {
      on: jest.fn(),
    },
    stderr: {
      on: jest.fn(),
    },
    stdin: {
      write: jest.fn(),
    },
    on: jest.fn(),
    kill: jest.fn(),
  })),
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LARK_APP_ID = 'test-app-id';
process.env.LARK_APP_SECRET = 'test-app-secret';