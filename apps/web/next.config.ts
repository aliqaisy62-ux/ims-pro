import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ims-pro/ui', '@ims-pro/i18n', '@ims-pro/types'],
  images: {
    domains: ['localhost'],
  },
}

export default nextConfig
