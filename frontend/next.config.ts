// frontend/next.config.ts
import { env } from 'process';

const API_URL = env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: `${API_URL}/uploads/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${API_URL}/:path*`,
      },
    ];
  },
  // output: "export",
  // Type-check environment variables at build time
  env: {
    NEXT_PUBLIC_API_URL: API_URL,
    NEXT_PUBLIC_WS_URL: env.NEXT_PUBLIC_WS_URL || `ws://${API_URL.split('://')[1]}`,
  },
  devIndicators: {
    appIsrStatus: false,
    buildActivity: true,
    buildActivityPosition: 'bottom-right'
  },
};

export default nextConfig;