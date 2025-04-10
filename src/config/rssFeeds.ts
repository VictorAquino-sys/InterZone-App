export type RSSLocale = 'US-en' | 'PE-es';

const RSS_FEEDS: Record<RSSLocale, string[]> = {
  'US-en': [
    'https://feeds.npr.org/1001/rss.xml',
    'https://feeds.a.dj.com/rss/RSSWorldNews.xml',
    'https://www.washingtonpost.com/?outputType=rss'
  ],
  'PE-es': [
    'https://elcomercio.pe/arc/outboundfeeds/rss/category/bbc-news-mundo/?outputType=xml',
    'https://elcomercio.pe/arc/outboundfeeds/rss/category/gastronomia/?outputType=xml',
    'https://elcomercio.pe/arc/outboundfeeds/rss/category/lima/?outputType=xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/Es.xml',
  ]
};

export default RSS_FEEDS;

  