import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://tradeinsightai.com/',
      lastModified: new Date().toISOString(),
    },
    {
      url: 'https://tradeinsightai.com/about',
      lastModified: new Date().toISOString(),
    },
    {
      url: 'https://tradeinsightai.com/chat',
      lastModified: new Date().toISOString(),
    },
    {
      url: 'https://tradeinsightai.com/login',
      lastModified: new Date().toISOString(),
    },
    {
      url: 'https://tradeinsightai.com/settings',
      lastModified: new Date().toISOString(),
    },
    {
      url: 'https://tradeinsightai.com/upload',
      lastModified: new Date().toISOString(),
    },
  ];
}
