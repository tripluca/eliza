import { Action, IAgentRuntime } from '@elizaos/core';
import { parse } from 'csv-parse/sync';

interface StockItem {
    CODE: string;
    DESCRIPTION: string;
    "IN STOCK": number;
    "CONSUMED PER UNIT": number;
    "COST PER UNIT": number;
}

// Plugin calculation function - separated from agent logic
const calculateStockValue = (records: StockItem[]) => {
    const output: string[] = [];
    let manipoloTotal = 0;
    let malletTotal = 0;
    let inMalletSection = false;

    console.log('Starting calculations with records:', records.length);
    output.push("TOTAL VALUE OF STOCK PER ITEM:");
    
    for (let record of records) {
        if (!record.CODE || record.CODE === 'CODE') {
            console.log('Skipping empty or header record');
            continue;
        }

        const inStock = Number(record['IN STOCK']) || 0;
        const costStr = String(record['COST PER UNIT']).trim();
        const costPerUnit = Number(costStr) || 0;
        
        console.log('Processing record:', {
            code: record.CODE,
            inStock,
            costPerUnit,
            costStr
        });

        if (record.CODE === 'CAVBIPEU') {
            console.log('Switching to MALLET section');
            inMalletSection = true;
            output.push("\nMALLET");
        } else if (!inMalletSection && output.length === 1) {
            output.push("\nMANIPOLO");
        }

        const itemTotal = inStock * costPerUnit;
        if (inMalletSection) {
            malletTotal += itemTotal;
        } else {
            manipoloTotal += itemTotal;
        }

        output.push(`${record.CODE}: ${inStock} pieces * ${costPerUnit.toFixed(2)} = ${itemTotal.toFixed(2)}`);
    }

    console.log('Final totals:', { manipoloTotal, malletTotal });
    output.push(`\nTOTAL VALUE OF STOCK FOR MANIPOLO = ${manipoloTotal.toFixed(2)}`);
    output.push(`TOTAL VALUE OF STOCK FOR MALLET = ${malletTotal.toFixed(2)}`);
    output.push(`\nTOTAL VALUE OF STOCK = ${(manipoloTotal + malletTotal).toFixed(2)}`);
    
    return output.join("\n");
};

export const readCSV: Action = {
    name: 'READ_CSV',
    description: 'Read and analyze BOM data from CSV files',
    similes: ['CALCULATE_STOCK', 'ANALYZE_BOM', 'CHECK_INVENTORY', 'VERIFY_STOCK', 'COMPUTE_VALUES'],
    examples: [
        [
            {
                user: "{{user1}}",
                content: { 
                    text: "Here's the BOM file for analysis",
                    attachments: [{
                        id: "example1",
                        text: "CODE,DESCRIPTION,IN STOCK,CONSUMED PER UNIT,COST PER UNIT",
                        url: "file://inventory.csv",
                        title: "BOM Data",
                        source: "user",
                        description: "Stock inventory CSV"
                    }],
                    action: "READ_CSV"
                }
            }
        ]
    ],
    validate: async (runtime: IAgentRuntime, message: any) => {
        const attachment = message.content?.attachments?.[0];
        const url = attachment?.url || '';
        const baseUrl = url.split('?')[0];
        const hasValidAttachment = attachment?.url && baseUrl.toLowerCase().endsWith('.csv');
        
        console.log('Validation state:', { 
            hasValidAttachment,
            attachmentUrl: url,
            baseUrl
        });

        return hasValidAttachment;
    },
    handler: async (runtime: IAgentRuntime, message: any) => {
        const attachment = message.content?.attachments?.[0];
        
        try {
            if (!attachment?.url) {
                return { 
                    text: "Please provide a CSV file to analyze.",
                    shouldContinue: false
                };
            }

            console.log('Starting CSV processing...');
            console.log('Attempting to download CSV from:', attachment.url);
            const response = await fetch(attachment.url);
            console.log('Fetch response:', {
                status: response.status,
                statusText: response.statusText,
                contentType: response.headers.get('content-type'),
                contentLength: response.headers.get('content-length')
            });
            
            if (!response.ok) {
                throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
            }
            
            const csvContent = await response.text();
            console.log('Download successful!');
            console.log('Downloaded CSV content length:', csvContent.length);
            console.log('First 100 chars:', csvContent.substring(0, 100));

            const cleanedContent = csvContent
                .split('\n')
                .filter(line => line.trim() !== ',,,,')
                .join('\n');

            console.log('Cleaned content length:', cleanedContent.length);
            
            const records = parse(cleanedContent, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            }) as StockItem[];

            console.log('Parsed records count:', records.length);
            if (records.length === 0) {
                throw new Error('No valid records found in CSV');
            }

            console.log('Starting stock value calculation...');
            const stockValueReport = calculateStockValue(records);
            console.log('Calculation completed, results:', stockValueReport);

            return {
                text: stockValueReport,
                shouldContinue: false
            };
        } catch (error) {
            console.error('Error analyzing CSV:', error);
            return { 
                text: `Error processing the CSV file: ${error.message}`,
                shouldContinue: false
            };
        }
    }
}; 