// Tests for the logger utility
import { logger } from '../../src/utils/logger';

// Mock console methods
console.log = jest.fn();
console.error = jest.fn();

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('task method should log with correct prefix', () => {
    logger.task('Test task message');
    expect(console.log).toHaveBeenCalledTimes(1);
    const logMessage = (console.log as jest.Mock).mock.calls[0][0];
    expect(logMessage).toContain('[Task]');
    expect(logMessage).toContain('Test task message');
  });

  test('plan method should log with correct prefix', () => {
    logger.plan('Test plan message');
    expect(console.log).toHaveBeenCalledTimes(1);
    const logMessage = (console.log as jest.Mock).mock.calls[0][0];
    expect(logMessage).toContain('[Plan]');
    expect(logMessage).toContain('Test plan message');
  });

  test('action method should log with correct prefix', () => {
    logger.action('Test action message');
    expect(console.log).toHaveBeenCalledTimes(1);
    const logMessage = (console.log as jest.Mock).mock.calls[0][0];
    expect(logMessage).toContain('[Action]');
    expect(logMessage).toContain('Test action message');
  });

  test('observation method should log with correct prefix', () => {
    logger.observation('Test observation message');
    expect(console.log).toHaveBeenCalledTimes(1);
    const logMessage = (console.log as jest.Mock).mock.calls[0][0];
    expect(logMessage).toContain('[Observation]');
    expect(logMessage).toContain('Test observation message');
  });

  test('system method should log with correct prefix', () => {
    logger.system('Test system message');
    expect(console.log).toHaveBeenCalledTimes(1);
    const logMessage = (console.log as jest.Mock).mock.calls[0][0];
    expect(logMessage).toContain('[System]');
    expect(logMessage).toContain('Test system message');
  });

  test('error method should log error with correct prefix', () => {
    logger.error('Test error message');
    expect(console.error).toHaveBeenCalledTimes(1);
    const logMessage = (console.error as jest.Mock).mock.calls[0][0];
    expect(logMessage).toContain('[Error]');
    expect(logMessage).toContain('Test error message');
  });

  test('success method should log with correct prefix', () => {
    logger.success('Test success message');
    expect(console.log).toHaveBeenCalledTimes(1);
    const logMessage = (console.log as jest.Mock).mock.calls[0][0];
    expect(logMessage).toContain('[Success]');
    expect(logMessage).toContain('Test success message');
  });
});
