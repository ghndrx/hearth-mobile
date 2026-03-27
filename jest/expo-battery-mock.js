// Mock for expo-battery module
module.exports = {
  getBatteryLevelAsync: jest.fn(() => Promise.resolve(0.75)),
  getBatteryStateAsync: jest.fn(() => Promise.resolve(2)), // FULL
  isLowPowerModeEnabledAsync: jest.fn(() => Promise.resolve(false)),
  BatteryState: {
    UNKNOWN: 0,
    UNPLUGGED: 1,
    CHARGING: 2,
    FULL: 3,
  },
  PowerState: {
    UNKNOWN: 'unknown',
    UNPLUGGED: 'unplugged',
    CHARGING: 'charging',
    FULL: 'full',
  }
};