// Dynamic Expo config - extends app.json with environment-specific values
module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      // API URL configuration - can be overridden by environment variables
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://hearth.example.com/api/v1",
      // EAS project ID (if using EAS)
      eas: {
        projectId: process.env.EAS_PROJECT_ID || config.extra?.eas?.projectId,
      },
    },
  };
};
