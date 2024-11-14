const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const fs = require('fs');

// RSSフィードとAtomフィードのURLを指定
const feedUrlsJp = [
    'https://zenn.dev/akira19/feed',  // RSS形式のフィード
    'https://qiita.com/_akira19/feed'  // Atom形式のフィード
];

const feedUrlsEn = [
  'https://dev.to/feed/_akira19'
];

// フィードから記事情報を取得する関数（RSSとAtom両方に対応）
async function fetchArticlesFromFeed(url) {
    try {
        const response = await axios.get(url);
        const feedData = response.data;

        // XMLをパースしてフィード形式を判別
        const parsedData = await parseStringPromise(feedData);

        // フィードがRSS形式の場合
        if (parsedData.rss) {
            return parsedData.rss.channel[0].item.map(item => ({
                title: item.title[0],
                link: item.link[0],
                pubDate: new Date(item.pubDate[0])
            }));
        }

        // フィードがAtom形式の場合
        if (parsedData.feed) {
            return parsedData.feed.entry.map(entry => ({
                title: entry.title[0],
                link: entry.link[0].$.href,
                pubDate: new Date(entry.updated[0])
            }));
        }

        return [];
    } catch (error) {
        console.error(`フィードの取得または解析中にエラーが発生しました: ${url}`, error);
        return [];
    }
}

// 全てのフィードから記事を取得し、発行日の新しい順にソートして上位3件を返す関数
async function getLatestArticles(urls) {
    const allArticles = [];

    // 各フィードから記事を取得して配列に追加
    for (const url of urls) {
        const articles = await fetchArticlesFromFeed(url);
        allArticles.push(...articles);
    }

    // 発行日の新しい順にソートし、最新の3件を取得
    allArticles.sort((a, b) => b.pubDate - a.pubDate);
    return allArticles.slice(0, 3);
}

// README.mdの`# articles`セクションに記事を書き込む関数
async function updateReadme() {
    const latestArticlesJp = await getLatestArticles(feedUrlsJp);
    const latestArticlesEn = await getLatestArticles(feedUrlsEn);
    let readmeContent = fs.readFileSync('README.md', 'utf-8');

    // 最新記事のMarkdownリストを作成
  const articleMarkdown = latestArticlesJp.map(article => `- [${article.title}](${article.link})`).join('\n');
  
  const articleMarkdownEn = latestArticlesEn.map(article => `- [${article.title}](${article.link})`).join('\n');


    // `# articles`セクションに記事を書き込む
    const newContentJp = readmeContent.replace(
        /(<!-- JapaneseArticles -->\n\n)(- .*\n)*/g,
        `$1${articleMarkdown}\n`
    );

    const newContent = newContentJp.replace(
      /(<!-- EnglishArticles -->\n\n)(- .*\n)*/g,
      `$1${articleMarkdownEn}\n`
  );

    fs.writeFileSync('README.md', newContent, 'utf-8');
    console.log('README.mdが更新されました');
}

// スクリプトを実行
updateReadme();