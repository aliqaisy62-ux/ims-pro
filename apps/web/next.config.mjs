import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // standalone is only needed for the Electron desktop build (build.ps1 sets this).
  // Vercel and local dev must NOT set it — Vercel manages its own output format.
  ...(process.env.NEXT_OUTPUT_STANDALONE === '1' && { output: 'standalone' }),
  transpilePackages: ['@ims-pro/ui', '@ims-pro/i18n', '@ims-pro/types'],
  images: {
    domains: ['localhost'],
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.join(__dirname, 'src'),
    }
    return config
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'
    return [
      {
        source: '/api-proxy/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ]
  },
}

export default nextConfig
