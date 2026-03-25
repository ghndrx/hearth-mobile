module.exports = function (api) {
  api.cache(true);

  // Use simplified config for Jest environment to avoid worklets issues
  if (process.env.NODE_ENV === 'test') {
    return {
      presets: [
        "babel-preset-expo",  // Simplified expo preset without customization
      ],
      // Remove all plugins for testing to avoid conflicts
      plugins: [],
    };
  }

  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      ["react-native-reanimated/plugin", {
        relativeSourceLocation: true
      }]
    ],
  };
};
