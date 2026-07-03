import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@pm/ui', '@pm/types', '@pm/utils', '@pm/config'],
};

export default nextConfig;
