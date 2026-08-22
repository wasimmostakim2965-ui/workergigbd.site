import { useEffect } from 'react';

type SeoConfig = {
  title: string;
  description: string;
  path?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
};

const SITE_URL = 'https://www.workergigbd.site';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  const selector = attr === 'property' ? `meta[property="${key}"]` : `meta[name="${key}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertJsonLd(id: string, json: object) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(json);
}

function removeJsonLd(id: string) {
  document.getElementById(id)?.remove();
}

/**
 * Lightweight per-route SEO: sets <title>, meta description, canonical,
 * Open Graph + Twitter tags, and an optional Breadcrumb JSON-LD.
 */
export function useSeo({ title, description, path, type = 'website', noindex }: SeoConfig) {
  useEffect(() => {
    const url = path ? `${SITE_URL}${path}` : SITE_URL;
    document.title = title;

    setMeta('name', 'title', title);
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:image', DEFAULT_OG_IMAGE);
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:url', url);
    setMeta('name', 'twitter:image', DEFAULT_OG_IMAGE);
    upsertLink('canonical', url);

    if (noindex) {
      setMeta('name', 'robots', 'noindex, follow');
    } else {
      setMeta('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    }

    if (path && path !== '/') {
      const segs = path.split('/').filter(Boolean);
      const names: Record<string, string> = {
        login: 'লগইন',
        signup: 'সাইন আপ',
        dashboard: 'ড্যাশবোর্ড',
        'find-jobs': 'কাজ খুঁজুন',
        'post-job': 'কাজ পোস্ট করুন',
        'my-tasks': 'আমার টাস্ক',
        'my-jobs': 'আমার জব',
        deposit: 'ডিপোজিট',
        withdraw: 'উইথড্র',
        'share-earn': 'শেয়ার ও আয়',
        premium: 'প্রিমিয়াম',
        'privacy-policy': 'প্রাইভেসি পলিসি',
        'terms-of-service': 'টার্মস অফ সার্ভিস',
        'admin-login': 'অ্যাডমিন',
      };
      const crumbs = segs.map((s, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: names[s] || s,
        item: `${SITE_URL}/${segs.slice(0, i + 1).join('/')}`,
      }));
      upsertJsonLd('ld-breadcrumb', {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: crumbs,
      });
    } else {
      removeJsonLd('ld-breadcrumb');
    }

    return () => {
      // restore canonical to homepage on unmount
      upsertLink('canonical', `${SITE_URL}/`);
      setMeta('property', 'og:url', `${SITE_URL}/`);
      setMeta('name', 'twitter:url', `${SITE_URL}/`);
      removeJsonLd('ld-breadcrumb');
    };
  }, [title, description, path, type, noindex]);
}
