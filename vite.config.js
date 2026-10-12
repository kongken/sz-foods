import { defineConfig } from 'vite';

// 分享卡片的图片和链接必须是绝对地址。
// 优先用 SITE_URL(自定义域名),其次 Cloudflare Pages 构建时自带的 CF_PAGES_URL;本地开发留空(相对路径)。
const siteUrl = (process.env.SITE_URL || process.env.CF_PAGES_URL || '').replace(/\/+$/, '');

export default defineConfig({
  plugins: [
    {
      name: 'site-url',
      transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', siteUrl),
    },
  ],
});
