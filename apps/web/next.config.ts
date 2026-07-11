import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

interface WebpackPathData {
  chunk?: {
    name?: string | number | null;
  };
}

const createNextConfig = (phase: string): NextConfig => ({
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
  transpilePackages: ['@pm/ui', '@pm/types', '@pm/utils', '@pm/config'],
  webpack: (config, { dev, isServer }) => {
    if (isServer && !dev && config.output) {
      config.output.chunkFilename = (pathData: WebpackPathData) => {
        const chunkName = String(pathData.chunk?.name ?? '[name]');

        if (chunkName.startsWith('vendor-chunks/')) {
          return '[name].js';
        }

        return 'chunks/[name].js';
      };
    }
    return config;
  },
});

export default createNextConfig;
