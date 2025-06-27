import Parser from 'rss-parser';
import fs from 'fs';
import path from 'path';
import { formatJP } from '../src/utils/formatJP.js';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  content?: string;
  contentSnippet?: string;
}

interface EnrichedNewsItem {
  title: string;
  link: string;
  formatted: string;
  source: string;
}

const parser = new Parser();

async function fetchNews(): Promise<void> {
  try {
    const newsItems: NewsItem[] = [];
    
    const FEEDS = [
      'https://news.google.com/rss/search?q=%E6%9D%B1%E4%BA%AC%E9%83%BD%E5%BA%9C%E4%B8%AD%E5%B8%82&hl=ja&gl=JP&ceid=JP:ja',
      
      'https://news.google.com/rss/search?q=%E5%BA%9C%E4%B8%AD%E5%B8%82%20%E6%9D%B1%E4%BA%AC&hl=ja&gl=JP&ceid=JP:ja'
    ];

    for (const rssUrl of FEEDS) {
      try {
        console.log(`Fetching RSS from: ${rssUrl}`);
        const feed = await parser.parseURL(rssUrl);
        
        if (feed.items) {
          feed.items.forEach(item => {
            if (item.title && item.link && item.pubDate) {
              const title = item.title.toLowerCase();
              const isHiroshimaFuchu = title.includes('広島') || title.includes('hiroshima');
              const isTokyoFuchu = title.includes('府中') && (
                title.includes('東京') || 
                title.includes('tokyo') ||
                item.link?.includes('tokyo') ||
                !title.includes('広島')
              );
              
              if (isTokyoFuchu && !isHiroshimaFuchu) {
                newsItems.push({
                  title: item.title,
                  link: item.link,
                  pubDate: item.pubDate,
                  content: item.content,
                  contentSnippet: item.contentSnippet
                });
              }
            }
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch RSS from ${rssUrl}:`, error);
      }
    }

    newsItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    const latestNews = newsItems.slice(0, 100);

    if (latestNews.length === 0) {
      console.warn('⚠️  No news items fetched!');
      process.exitCode = 0; // ビルドは継続
    }

    const enriched: EnrichedNewsItem[] = latestNews.map(i => ({
      title: i.title ?? '',
      link: i.link ?? '',
      formatted: formatJP(i.pubDate!),
      source: new URL(i.link!).hostname.replace('www.', '')
    }));

    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const outputPath = path.join(dataDir, 'news.json');
    fs.writeFileSync(outputPath, JSON.stringify(enriched, null, 2), 'utf-8');
    
    console.log(`Successfully saved ${enriched.length} news items to ${outputPath}`);
    
    if (process.env.DISCORD_WEBHOOK_URL && enriched.length > 0) {
      await sendDiscordNotification(latestNews.slice(0, 3)); // 最新3件を通知
    }
    
  } catch (error) {
    console.error('Error fetching news:', error);
    
    const dummyData: NewsItem[] = [
      {
        title: "府中市からのお知らせ（サンプル）",
        link: "https://www.city.fuchu.tokyo.jp/",
        pubDate: new Date().toISOString(),
        contentSnippet: "これはサンプルニュースです。実際のRSSフィードが利用可能になると、最新のニュースが表示されます。"
      }
    ];
    
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const outputPath = path.join(dataDir, 'news.json');
    fs.writeFileSync(outputPath, JSON.stringify(dummyData, null, 2), 'utf-8');
    console.log('Created dummy news data due to fetch error');
  }
}

async function sendDiscordNotification(newsItems: NewsItem[]): Promise<void> {
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;

    const message = {
      content: "🏛️ **府中市ポータル - 最新ニュース更新**",
      embeds: newsItems.map(item => ({
        title: item.title,
        url: item.link,
        description: item.contentSnippet?.substring(0, 200) + (item.contentSnippet && item.contentSnippet.length > 200 ? '...' : ''),
        timestamp: item.pubDate,
        color: 0x667eea
      }))
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    });

    if (response.ok) {
      console.log('Discord notification sent successfully');
    } else {
      console.warn('Failed to send Discord notification:', response.statusText);
    }
  } catch (error) {
    console.warn('Error sending Discord notification:', error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchNews();
}



export { fetchNews };
