module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      '@babel/preset-typescript'
    ],
    plugins: [
      // React Native Reanimated plugin must be last
      'react-native-reanimated/plugin'
    ]
  };
};