import { elizaLogger } from "@elizaos/core";
import {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    Plugin,
    State,
    SearchResult
} from "@elizaos/core";
import { generateWebSearch } from "@elizaos/core";
import { encodingForModel, TiktokenModel } from "js-tiktoken";
import OpenAI from "openai";

// 1. Default settings
const DEFAULT_MAX_TOKENS = 4000;
const DEFAULT_MODEL_ENCODING = "gpt-3.5-turbo";

// 2. Time configurations
const TIME_RANGES = {
    DEFAULT: 7,
    MAX: 30,
    MIN: 1
} as const;

// 3. Domain configurations
const ALLOWED_DOMAINS = [
    // Major Financial News
    "bloomberg.com/crypto",
    "reuters.com/technology/crypto",
    "ft.com/cryptofinance",
    // Crypto-Specific
    "coindesk.com",
    "theblock.co",
    "cointelegraph.com",
    // Research & Analysis
    "messari.io",
    "galaxy.com/research",
    "glassnode.com/insights"
];

const EXCLUDED_PATHS = [
    '/category/',
    '/tag/',
    '/topics/',
    '/author/',
    '/about/',
    '/contact/',
    '/search/',
    '/privacy/',
    '/terms/',
    '/advertise/'
];

// 4. Display configurations
const DOMAIN_MAPPING = {
    "bloomberg.com/crypto": "Bloomberg Crypto",
    "reuters.com/technology/crypto": "Reuters Crypto",
    "ft.com/cryptofinance": "Financial Times",
    "coindesk.com": "CoinDesk",
    "theblock.co": "The Block",
    "cointelegraph.com": "CoinTelegraph",
    "messari.io": "Messari",
    "galaxy.com/research": "Galaxy Research",
    "glassnode.com/insights": "Glassnode"
} as const;

const NEWS_SOURCES = {
    financial: ["Bloomberg Crypto", "Reuters Crypto", "Financial Times"],
    crypto: ["CoinDesk", "CoinTelegraph", "The Block"],
    research: ["Messari", "Galaxy Digital Research", "Glassnode"]
};

const SENTIMENT_EMOJIS = {
    positive: '📈',
    negative: '📉',
    neutral: '📊'
};

// 5. Interfaces
interface SearchOptions {
    timeframe?: number;
}

interface NewsItemWithSentiment extends SearchResult {
    sentiment?: 'positive' | 'negative' | 'neutral';
}

interface SentimentAnalysis {
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
}

interface TavilySearchResponse {
    results?: SearchResult[];
    error?: string;
}

// Add interface for Tavily search options
interface TavilySearchOptions {
    max_results?: number;
    search_depth?: "basic" | "advanced";
    include_raw_content?: boolean;
    include_domains?: string[];
    sort_by?: "relevance" | "date";
    api_key?: string;
    k?: number;
}

function getTotalTokensFromString(
    str: string,
    encodingName: TiktokenModel = DEFAULT_MODEL_ENCODING
) {
    const encoding = encodingForModel(encodingName);
    return encoding.encode(str).length;
}

function limitTokens(
    data: string,
    maxTokens: number = DEFAULT_MAX_TOKENS
): string {
    if (getTotalTokensFromString(data) >= maxTokens) {
        return data.slice(0, maxTokens);
    }
    return data;
}

function formatNewsItem(result: NewsItemWithSentiment & { abstract?: string }): string {
    if (!result.publishedDate || !isRecentArticle(result.publishedDate)) {
        return '';
    }

    const date = new Date(result.publishedDate);
    const sourceName = extractSourceName(result.url);
    const sentimentEmoji = result.sentiment ? SENTIMENT_EMOJIS[result.sentiment] : '';
    const abstract = result.abstract ? `\n   ${result.abstract}` : '';
    
    // More concise title format with date
    return `${sentimentEmoji} ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${result.title}\n` +
           `   Source: ${sourceName} (${result.url})${abstract}`;
}

function isValidNewsUrl(url: string): boolean {
    return !EXCLUDED_PATHS.some(path => url.includes(path));
}

function cleanPrompt(text: string): string {
    // Remove Discord mention tags
    return text.replace(/<@&?\d+>/g, '').trim();
}

// Update buildSearchPrompt to accept timeframe
function buildSearchPrompt(query: string, timeframe: number = TIME_RANGES.DEFAULT): { searchQuery: string } {
    const cleanQuery = cleanPrompt(query);
    
    // Include search options in the query string
    const searchQuery = `${cleanQuery} cryptocurrency news max_results:20 search_depth:advanced`;
    
    elizaLogger.log("Search query:", { 
        query: searchQuery,
        timeframe,
        domains: ALLOWED_DOMAINS,
        expectedResults: 20
    });
    
    return { searchQuery };
}

// Update isRecentArticle to accept timeframe
function isRecentArticle(publishedDate: string | undefined, timeframe: number = TIME_RANGES.DEFAULT): boolean {
    if (!publishedDate) return false;
    
    const articleDate = new Date(publishedDate);
    const now = new Date();
    
    // Reject future dates
    if (articleDate > now) {
        elizaLogger.log("Rejected future date:", articleDate);
        return false;
    }
    
    const diffDays = (now.getTime() - articleDate.getTime()) / (1000 * 60 * 60 * 24);
    return !isNaN(articleDate.getTime()) && diffDays <= timeframe;
}

function extractSourceName(url: string): string {
    try {
        const domain = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)?.[1] || '';
        const path = url.split(domain)[1] || '';
        const fullDomain = domain + path;
        
        // Find matching domain from our mapping
        const matchedDomain = Object.keys(DOMAIN_MAPPING).find(d => fullDomain.includes(d));
        return matchedDomain ? DOMAIN_MAPPING[matchedDomain] : 'Unknown Source';
    } catch {
        return 'Unknown Source';
    }
}

async function analyzeSentiment(title: string, runtime: IAgentRuntime): Promise<SentimentAnalysis | null> {
    try {
        const apiKey = runtime.getSetting("OPENAI_API_KEY");
        if (!apiKey) {
            elizaLogger.error("OpenAI API key not found");
            return null;
        }

        // Use Eliza's model management
        const model = runtime.getSetting("SMALL_OPENAI_MODEL") || "gpt-3.5-turbo";
        const openai = new OpenAI({ apiKey });

        const response = await openai.chat.completions.create({
            model,
            messages: [{
                role: "user",
                content: `Analyze the sentiment of this crypto news headline. Respond with only "positive", "negative", or "neutral":\n\n"${title}"`
            }],
            temperature: 0.3,
            max_tokens: 10
        });

        const sentiment = response.choices[0]?.message?.content?.toLowerCase().trim() as 'positive' | 'negative' | 'neutral';
        const confidence = response.choices[0]?.finish_reason === 'stop' ? 1 : 0.5;

        return { sentiment, confidence };
    } catch (error) {
        elizaLogger.error('Error analyzing sentiment:', error);
        return null;
    }
}

// Helper function to format sources for error messages
function formatSourcesList(): string {
    const allSources = [
        ...NEWS_SOURCES.financial,
        ...NEWS_SOURCES.crypto,
        ...NEWS_SOURCES.research
    ];
    return allSources.join(", ");
}

async function processArticle(result: SearchResult, runtime: IAgentRuntime): Promise<{ date?: string, abstract?: string }> {
    const content = result.content || result.rawContent || '';
    if (!content) return {};

    try {
        const apiKey = runtime.getSetting("OPENAI_API_KEY");
        if (!apiKey) return {};

        // Use GPT-4 for better date extraction
        const model = "gpt-4-turbo-preview";
        const openai = new OpenAI({ apiKey });

        elizaLogger.log("Using model for date extraction:", model);

        const prompt = `Find the article's publication date using these sources in order of priority:

1. Article metadata with explicit labels:
   - "Published:" or "Published on:"
   - "Posted:" or "Posted on:"
   - "Last updated:" or "Updated:"
2. Author byline with date
3. URL date pattern (e.g., if URL contains /2024/12/31/ consider December 31, 2024)
4. Title date references IF they clearly indicate publication date

Article URL: ${result.url}
Article Title: ${result.title}
Article Content:
${content}

Format your response exactly like this:
DATE: [YYYY-MM-DD]
TYPE: [published/updated]
CONFIDENCE: [high/medium/low]
SOURCE: [Exactly where you found the date, e.g. "URL pattern /2024/12/31/", "Published: header", "Title reference"]
REASONING: [Brief explanation of why you chose this date]
EXTRACTED_INFO: [List any dates you found, even if not used as the final date]
ABSTRACT: [2-3 sentence summary]`;

        const response = await openai.chat.completions.create({
            model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            max_tokens: 200
        });

        const output = response.choices[0]?.message?.content?.trim() || '';
        const [dateLine, typeLine, confidenceLine, sourceLine, reasoningLine, extractedInfoLine, ...abstractLines] = output.split('\n');
        
        // Extract all components
        const dateMatch = dateLine.match(/DATE:\s*(\d{4}-\d{2}-\d{2}|unknown)/);
        const typeMatch = typeLine.match(/TYPE:\s*(\w+)/);
        const confidenceMatch = confidenceLine.match(/CONFIDENCE:\s*(\w+)/);
        const sourceMatch = sourceLine.match(/SOURCE:\s*(.+)/);
        const reasoningMatch = reasoningLine.match(/REASONING:\s*(.+)/);
        const extractedInfoMatch = extractedInfoLine.match(/EXTRACTED_INFO:\s*(.+)/);
        
        const dateStr = dateMatch?.[1];
        const type = typeMatch?.[1];
        const confidence = confidenceMatch?.[1];
        const source = sourceMatch?.[1];
        const reasoning = reasoningMatch?.[1];
        const extractedInfo = extractedInfoMatch?.[1];
        
        // Only accept dates with sufficient confidence
        const date = dateStr && dateStr !== "unknown" && confidence !== "low" ? new Date(dateStr) : undefined;
        const validDate = date && !isNaN(date.getTime()) ? date.toISOString() : undefined;
        
        // Combine remaining lines into abstract
        const abstract = abstractLines.join(' ').replace(/ABSTRACT:\s*/, '').trim();

        elizaLogger.log("GPT processed article:", { 
            rawDateLine: dateLine,
            extractedDate: dateStr,
            type,
            confidence,
            source,
            reasoning,
            extractedInfo,
            validDate,
            abstract: abstract?.substring(0, 100) + '...' 
        });
        
        return {
            date: validDate,
            abstract: abstract || undefined
        };
    } catch (error) {
        elizaLogger.error('Error processing article:', error);
        return {};
    }
}

const cryptoNews: Action = {
    name: "CRYPTO_NEWS",
    similes: ["NEWS_SEARCH", "CRYPTO_UPDATES", "MARKET_NEWS"],
    description: "Search for recent crypto news from trusted sources.",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return !!runtime.getSetting("TAVILY_API_KEY");
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: SearchOptions,
        callback: HandlerCallback
    ) => {
        elizaLogger.log("Composing state for message:", message);
        state = (await runtime.composeState(message)) as State;
        const userId = runtime.agentId;
        elizaLogger.log("User ID:", userId);

        // Extract timeframe from message if present
        const timeframeMatch = message.content.text.match(/(?:last|past)\s+(\d+)\s+days?/i);
        const requestedTimeframe = timeframeMatch ? parseInt(timeframeMatch[1]) : TIME_RANGES.DEFAULT;
        const timeframe = Math.min(Math.max(requestedTimeframe, TIME_RANGES.MIN), TIME_RANGES.MAX);

        const basePrompt = message.content.text.replace(/(?:last|past)\s+\d+\s+days?/i, '').trim();
        const searchPrompt = buildSearchPrompt(basePrompt, timeframe);
        elizaLogger.log("crypto news search prompt:", searchPrompt);

        try {
            const searchResponse = await generateWebSearch(
                searchPrompt.searchQuery,
                runtime
            ) as TavilySearchResponse;
            
            // Filter results by allowed domains
            const filteredResults = (searchResponse.results || []).filter(result => {
                const domain = new URL(result.url).hostname;
                return ALLOWED_DOMAINS.some(allowedDomain => domain.includes(allowedDomain.split('/')[0]));
            });

            elizaLogger.log("Search results:", {
                total: searchResponse.results?.length || 0,
                filtered: filteredResults.length,
                domains: filteredResults.map(r => new URL(r.url).hostname)
            });

            if (searchResponse?.error) {
                elizaLogger.error(`Search failed: ${searchResponse.error}`);
                callback({
                    text: `Sorry, I encountered an error while searching for crypto news: ${searchResponse.error}`
                });
                return;
            }

            if (!filteredResults.length) {
                callback({
                    text: `I couldn't find any recent crypto news from our trusted sources (${formatSourcesList()}) within the last ${timeframe} days.`
                });
                return;
            }

            const resultsWithSentiment = await Promise.all(
                filteredResults.map(async result => {
                    const [sentiment, processed] = await Promise.all([
                        analyzeSentiment(result.title, runtime),
                        processArticle(result, runtime)
                    ]);

                    return {
                        ...result,
                        publishedDate: processed.date,
                        abstract: processed.abstract,
                        sentiment: sentiment?.sentiment
                    };
                })
            );

            const validResults = resultsWithSentiment
                .map(result => {
                    elizaLogger.log("Checking result:", {
                        url: result.url,
                        isValidUrl: isValidNewsUrl(result.url),
                        hasDate: !!result.publishedDate,
                        date: result.publishedDate,
                        isRecent: result.publishedDate ? isRecentArticle(result.publishedDate, timeframe) : false
                    });
                    
                    if (!isValidNewsUrl(result.url)) {
                        elizaLogger.log("Failed URL validation:", result.url);
                        return null;
                    }
                    if (!result.publishedDate) {
                        elizaLogger.log("Missing publish date:", result.title);
                        return null;
                    }
                    if (!isRecentArticle(result.publishedDate, timeframe)) {
                        elizaLogger.log("Article too old:", result.publishedDate);
                        return null;
                    }
                    
                    return formatNewsItem(result);
                })
                .filter(result => result !== null && result !== '')
                .join('\n\n');

            if (!validResults) {
                callback({
                    text: `I found some results but they didn't meet our quality criteria. Try:\n` +
                         `1. Being more specific with your search terms\n` +
                         `2. Adjusting the time range (1-30 days, currently searching last ${timeframe} days)\n` +
                         `3. Asking about specific topics like "Bitcoin", "regulations", "market trends", etc.`
                });
                return;
            }

            const timeframeNote = timeframe !== TIME_RANGES.DEFAULT 
                ? `\nShowing news from the last ${timeframe} days:`
                : '';

            callback({
                text: timeframeNote + '\n' + limitTokens(validResults)
            });

            // Update the debug logging to show processed results
            elizaLogger.log("Processed results:", resultsWithSentiment.map(r => ({
                title: r.title,
                publishedDate: r.publishedDate,
                abstract: r.abstract?.substring(0, 100) + '...',  // Show first 100 chars of abstract
                sentiment: r.sentiment
            })));
        } catch (error) {
            elizaLogger.error('Error during crypto news search:', error);
            callback({
                text: 'Sorry, I encountered an error while searching for crypto news. Please try again later.'
            });
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What are the latest regulatory developments in crypto?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Let me search for recent crypto regulatory news:",
                    action: "CRYPTO_NEWS",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Any institutional updates in crypto?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll check for recent institutional developments in crypto:",
                    action: "CRYPTO_NEWS",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Show me crypto news from the last 14 days",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Searching for crypto news from the past 14 days:",
                    action: "CRYPTO_NEWS",
                },
            },
        ],
    ],
} as Action;

export const cryptoNewsPlugin: Plugin = {
    name: "cryptoNews",
    description: "Search crypto news from trusted sources",
    actions: [cryptoNews],
    evaluators: [],
    providers: [],
};

export default cryptoNewsPlugin;
