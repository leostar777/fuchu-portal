import Parser from 'rss-parser';
import fs from 'fs';
import path from 'path';

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
      'https://news.google.com/rss/search?q=%E5%BA%9C%E4%B8%AD%E5%B8%82&hl=ja&gl=JP&ceid=JP:ja',
      
      'https://www3.nhk.or.jp/rss/news/cat0.xml',
      
      'https://news.yahoo.co.jp/rss/topics/top-picks.xml'
    ];

    for (const rssUrl of FEEDS) {
      try {
        console.log(`Fetching RSS from: ${rssUrl}`);
        const feed = await parser.parseURL(rssUrl);
        
        if (feed.items) {
          feed.items.forEach(item => {
            if (item.title && item.link && item.pubDate) {
              newsItems.push({
                title: item.title,
                link: item.link,
                pubDate: item.pubDate,
                content: item.content,
                contentSnippet: item.contentSnippet
              });
            }
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch RSS from ${rssUrl}:`, error);
      }
    }

    newsItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    const latestNews = newsItems.slice(0, 30);

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

    const top = enriched.slice(0, 7);
    const fuchu = enriched.slice(7);

    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const outputPath = path.join(dataDir, 'news.json');
    fs.writeFileSync(outputPath, JSON.stringify({ top, fuchu }, null, 2), 'utf-8');
    
    console.log(`Successfully saved ${top.length} top news and ${fuchu.length} fuchu news items to ${outputPath}`);
    
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

function formatJP(iso: string) {
  const d = new Date(iso);
  const w = '日月火水木金土'[d.getDay()];
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd}(${w})${hh}:${mi}`;
}

export { fetchNews };
