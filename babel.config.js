module.exports = function (api) {
  api.cache(true);

  // Use different config for Jest environment
  if (process.env.NODE_ENV === 'test') {
    return {
      presets: [
        ["babel-preset-expo", { jsxImportSource: "nativewind" }],
        "nativewind/babel",
      ],
      // Remove reanimated plugin for Jest as it causes issues
      plugins: [],
    };
  }

  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: ["react-native-reanimated/plugin"],
  };
};
