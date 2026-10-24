// API connection. The key is NOT in the repo: it is injected at build time
// from the EAS "preview" environment variable EXPO_PUBLIC_API_KEY.
export const API_BASE = 'https://codflow-server.basatbelaifa7.workers.dev';
export const API_KEY = process.env.EXPO_PUBLIC_API_KEY ?? '';
