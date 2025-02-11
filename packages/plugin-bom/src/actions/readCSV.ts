import { Action, type Memory, type ActionExample, type Media } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';

export const readCSV: Action = {
    name: 'READ_CSV',
    description: 'Read and analyze a CSV file containing BOM data',
    similes: ['ANALYZE_CSV', 'PROCESS_CSV', 'READ_BOM', 'ANALYZE_BOM'],
    examples: [
        [{
            user: '{{user1}}',
            content: {
                text: 'Here is the BOM file',
                media: [{
                    type: 'text/csv',
                    url: 'example.csv'
                }]
            }
        },
        {
            agent: 'mei',
            content: {
                text: 'Thank you for providing the BOM file. I have acknowledged receipt. Please confirm if you would like me to proceed with the analysis.'
            }
        }],
        [{
            user: '{{user1}}',
            content: {
                text: 'Yes, please proceed'
            }
        },
        {
            agent: 'mei',
            content: {
                text: 'I will now analyze the BOM file and provide you with the results.'
            }
        }]
    ] as ActionExample[][],

    async validate(runtime: any, message: Memory): Promise<boolean> {
        // For initial CSV upload
        const media = message.content?.media as Media[] | undefined;
        const hasCSV = media?.some(m => m.url?.toLowerCase().endsWith('.csv'));

        if (hasCSV) {
            const csvUrl = media.find(m => m.url?.toLowerCase().endsWith('.csv'))?.url;
            // Store the URL for later
            await runtime.state.set('csvData', {
                url: csvUrl,
                processed: false,
                timestamp: new Date().toISOString()
            });
            return true;
        }

        // For confirmation message
        if (message.content?.text?.toLowerCase().includes('yes') || 
            message.content?.text?.toLowerCase().includes('proceed')) {
            // Check if we have stored data
            const storedData = await runtime.state.get('csvData');
            const storedResults = await runtime.state.get('csvResults');
            
            // Return true if we have either unprocessed data or results
            return !!(storedData?.url && (!storedData.processed || storedResults?.results));
        }

        return false;
    },

    async handler(runtime: any, message: Memory): Promise<{ text: string }> {
        const media = message.content?.media as Media[] | undefined;
        const hasCSV = media?.some(m => m.url?.toLowerCase().endsWith('.csv'));

        // If this is the initial CSV upload
        if (hasCSV) {
            return {
                text: 'Thank you for providing the BOM file. I have acknowledged receipt. Please confirm if you would like me to proceed with the analysis.'
            };
        }

        // If this is a confirmation message
        const storedData = await runtime.state.get('csvData');
        const storedResults = await runtime.state.get('csvResults');

        // If we already have results, return them
        if (storedResults?.results) {
            return { text: storedResults.results };
        }

        // If we don't have the CSV data
        if (!storedData?.url) {
            return {
                text: 'I could not find a CSV file to analyze. Please upload a BOM file first.'
            };
        }

        try {
            elizaLogger.info('Attempting to download CSV from:', storedData.url);
            const csvResponse = await fetch(storedData.url);
            elizaLogger.info('Fetch response:', {
                status: csvResponse.status,
                statusText: csvResponse.statusText,
                contentType: csvResponse.headers.get('content-type'),
                contentLength: csvResponse.headers.get('content-length')
            });

            if (!csvResponse.ok) {
                throw new Error(`Failed to download CSV: ${csvResponse.statusText}`);
            }

            const content = await csvResponse.text();
            elizaLogger.info('Downloaded CSV content length:', content.length);
            elizaLogger.info('First 100 chars:', content.substring(0, 100));

            // Clean the content
            const cleanedContent = content.replace(/\r/g, '');
            elizaLogger.info('Cleaned content length:', cleanedContent.length);

            // Parse CSV
            const lines = cleanedContent.split('\n').filter(line => line.trim());
            
            // Pass the raw data to MEI for analysis using DeepSeek
            const prompt = `Here is the BOM data in CSV format:

${lines.join('\n')}

Please analyze this data according to the user's request.`;

            elizaLogger.debug('Starting DeepSeek API request with configuration:', {
                maxTokens: 1000,
                temperature: 0.1,
                promptLength: prompt.length,
                timestamp: new Date().toISOString()
            });

            try {
                elizaLogger.debug('Sending request to DeepSeek API...');
                elizaLogger.debug('Request details:', {
                    provider: runtime.modelProvider,
                    modelClass: runtime.character?.settings?.modelConfig?.modelClass,
                    token: runtime.token ? 'present' : 'missing',
                    timestamp: new Date().toISOString()
                });

                const aiResponse = await runtime.textGeneration.generate({
                    prompt,
                    maxTokens: 1000,
                    temperature: 0.1
                });

                elizaLogger.debug('DeepSeek API response received:', {
                    responseLength: aiResponse.text.length,
                    firstChars: aiResponse.text.substring(0, 100),
                    timestamp: new Date().toISOString()
                });

                // Store the results
                await runtime.state.set('csvResults', {
                    results: aiResponse.text,
                    timestamp: new Date().toISOString()
                });
                await runtime.state.set('csvData', {
                    ...storedData,
                    processed: true
                });

                return { text: aiResponse.text };

            } catch (error) {
                elizaLogger.error('DeepSeek API error:', {
                    error: error.message,
                    cause: error.cause,
                    timestamp: new Date().toISOString()
                });
                throw error;
            }

        } catch (error) {
            elizaLogger.error('Error processing CSV:', error);
            return {
                text: `I encountered an error while processing the CSV file: ${error.message}`
            };
        }
    }
};