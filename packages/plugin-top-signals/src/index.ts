import { Plugin, Provider } from '@elizaos/core';
import { checkMarketSignalsAction } from './actions/checkMarketSignals';
import { addMarketSignalAction } from './actions/addMarketSignal';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to sanitize strings for JSON
function sanitizeForJson(str: string): string {
  return str.replace(/[\u0000-\u001F\u007F-\u009F]/g, '')  // Remove control characters
           .replace(/'/g, "'")  // Replace smart quotes
           .trim();
}

function loadActiveSignals(): string[] {
  try {
    // Go up one level from agent directory to reach the project root
    const activeSignalsPath = join(process.cwd(), '../packages/plugin-top-signals/data/active_signals.txt');
    const data = readFileSync(activeSignalsPath, 'utf-8');
    return data.split('\n')
      .map(line => sanitizeForJson(line))
      .filter(line => line.trim());
  } catch (error) {
    console.error('[TopSignalsPlugin] Error loading active signals:', error);
    return [];
  }
}

const marketSignalsProvider: Provider = {
  get: async (runtime, message) => {
    console.log('\n[TopSignalsPlugin] *** PROVIDER GET CALLED ***');
    console.log('[TopSignalsPlugin] Full Message:', {
      id: message.id,
      content: message.content
    });
    
    // Only provide data if the message is asking about market signals
    const messageText = typeof message.content === 'string' 
      ? message.content 
      : typeof message.content === 'object' && message.content.text
        ? message.content.text
        : String(message.content);

    const patterns = [
      /market\s*(signals?|signs?|indicators?)/i,
      /active\s*(signals?|signs?|indicators?)/i,
      /current\s*(signals?|signs?|indicators?)/i,
      /status\s*of\s*(signals?|signs?|indicators?)/i,
      /market\s*(status|conditions?)/i,
      /what.*signals?/i,
      /what.*signs?/i,
      /how.*market/i,
      /status.*signals?/i,
      /how.*is.*market/i,
      /tell.*market/i,
      /show.*signals?/i
    ];

    console.log('[TopSignalsPlugin] Testing message:', messageText);
    const matches = patterns.map(pattern => ({
      pattern: pattern.toString(),
      matches: pattern.test(messageText)
    }));
    console.log('[TopSignalsPlugin] Pattern matches:', matches);

    const shouldProvide = matches.some(m => m.matches);
    if (!shouldProvide) {
      console.log('[TopSignalsPlugin] Message does not match signal patterns, skipping provider');
      return null;
    }

    try {
      console.log('\n[TopSignalsPlugin] *** LOADING ACTIVE SIGNALS ***');
      const signals = loadActiveSignals();
      console.log('[TopSignalsPlugin] Loaded active signals:', signals.length);
      
      // Format signals into a readable string for the agent's context
      const formattedSignals = [
        "📊 Current Market Signals:",
        "======================",
        ...signals.map(signal => `• ${signal}`),
        "\nAnalysis: These signals indicate the current market sentiment and activity levels."
      ].join('\n');
      
      console.log('[TopSignalsPlugin] Provider returning formatted signals:', formattedSignals);
      return formattedSignals;
    } catch (error) {
      console.error('[TopSignalsPlugin] Error loading active signals:', error);
      return null;
    }
  }
};

export const topSignalsPlugin: Plugin = {
  name: '@elizaos/plugin-top-signals',
  description: 'Plugin for managing top market signals in Eliza',
  actions: [checkMarketSignalsAction, addMarketSignalAction],
  evaluators: [],
  providers: [marketSignalsProvider]
};

export default topSignalsPlugin; 