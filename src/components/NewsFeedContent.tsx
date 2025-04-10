// src/components/NewsFeedContent.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Linking, ActivityIndicator, StyleSheet } from 'react-native';
import { XMLParser } from 'fast-xml-parser';
import RSS_FEEDS, { RSSLocale} from '@/config/rssFeeds';
import { useUser } from '@/contexts/UserContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';

dayjs.extend(relativeTime);

type CustomRSSItem = {
    title: string;
    link: string;
    pubDate?: string;
    contentSnippet?: string;
    description?: string;
    sourceUrl?: string; // ✅ This line makes TypeScript happy
    category?: string;
};

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
});

const getCountryLabelFromFeed = (url?: string): string => {
    if (!url) return '';
    if (url.includes('elcomercio.pe')) return '🇵🇪 El Comercio';
    if (url.includes('andina.pe')) return '🇵🇪 Andina';
    if (url.includes('rpp.pe')) return '🇵🇪 RPP Noticias';
    if (url.includes('npr.org')) return '🇺🇸 NPR';
    if (url.includes('cnn.com')) return '🇺🇸 CNN';
    return '🌐 News';
  };

const getCategoryFromFeed = (url?: string): string => {
    if (!url) return '';

    if (url.includes('politica')) return 'Política';
    if (url.includes('lima')) return 'Lima';
    if (url.includes('economia')) return 'Economía';
    if (url.includes('mundo')) return 'Mundo';
    if (url.includes('deportes')) return 'Deportes';

    if (url.includes('cnn')) return 'Top Stories';
    if (url.includes('npr')) return 'Headlines';
    if (url.includes('nytimes.com')) return '🇺🇸 NYT (Español)';

    return 'General';
};

// 🔧 Normalize country input to match RSS_FEEDS keys like 'PE-es'
const normalizeCountry = (country: string = 'US'): string => {
    return country
      .toUpperCase()
      .normalize('NFD')              // remove accents
      .replace(/[\u0300-\u036f]/g, '') // strip diacritics
      .slice(0, 2);                  // get first 2 chars
  };

const NewsFeedContent = () => {
    const [articles, setArticles] = useState<CustomRSSItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useUser();

    useEffect(() => {
        if (user?.language === 'es') {
            dayjs.locale('es');
        } else {
            dayjs.locale('en');
        }

        const fetchNews = async () => {
            setLoading(true);

            const normalizedCountry = normalizeCountry(user?.country);
            const localeKey = `${normalizedCountry}-${user?.language || 'en'}` as RSSLocale;
            const feeds = RSS_FEEDS[localeKey] || RSS_FEEDS['US-en'];

            console.log('🧭 localeKey:', localeKey);
            console.log('📰 Loading feeds:', feeds);

            let allItems: CustomRSSItem[] = [];

            for (const url of feeds) {
                try {
                    console.log(`📥 Fetching feed: ${url}`);
                    const res = await fetch(url);
                    const xml = await res.text();
                    const parsed = parser.parse(xml);
                    const items = parsed.rss?.channel?.item || [];
            
                    console.log(`✅ Fetched ${items.length} items from ${url}`);

                    const limitedItems = items.slice(0, 3); // ✅ Limit to 5 articles per feed

                    const formatted = limitedItems.map((item: any) => ({
                        title: item.title,
                        link: item.link,
                        pubDate: item.pubDate,
                        description: item.description,
                        sourceUrl: url,
                        category: getCategoryFromFeed(url), // ✅ new line here
                    }));
        
                    allItems.push(...formatted);
                } catch (err) {
                  console.warn(`Failed to fetch or parse ${url}`, err);
                }
            }

            allItems.sort((a, b) => {
                const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
                const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
                return dateB - dateA;
            });

            setArticles(allItems.slice(0, 20));
            setLoading(false);
        };

        fetchNews();
    }, []);

    if (loading) {
        return (
        <View style={styles.center}>
            <ActivityIndicator size="large" />
            <Text>Loading News...</Text>
        </View>
        );
    }

  return (
    <FlatList
        data={articles}
        keyExtractor={(item) => item.link || Math.random().toString()}
        renderItem={({ item }) => {
        if (!item.title || !item.link) return null; // Skip invalid items
        
        return (
            <TouchableOpacity onPress={() => Linking.openURL(item.link)} style={styles.card}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.snippet}>
                    {item.contentSnippet || item.description || ''}
                </Text>

                <View style={styles.metaRow}>
                    <Text style={styles.badge}>{getCountryLabelFromFeed(item.sourceUrl)}</Text>
                    <Text style={styles.badge}>{item.category}</Text>
                    <Text style={styles.timestamp}>{item.pubDate ? dayjs(item.pubDate).fromNow() : ''}</Text>
                </View>
            </TouchableOpacity>
        );
        }}
    />
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  article: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  source: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#007acc',
  },
  card: {
    marginVertical: 8,
    marginHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 17,
    marginBottom: 6,
    color: '#222',
  },
  snippet: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
  },
  
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  
  badge: {
    backgroundColor: '#e0f2f1',
    color: '#00796b',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 6,
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
});

export default NewsFeedContent;
