import type { MetadataRoute } from 'next';
import { SERVER_URL } from '@/lib/constants';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/cart', '/sign-in', '/sign-up'] },
    sitemap: new URL('/sitemap.xml', SERVER_URL).toString(),
  };
}
