import { Plugin } from '@elizaos/core';
import { readCSV } from './actions/readCSV';
import { bomProvider } from './providers/bomProvider';

export const plugin: Plugin = {
    name: 'bom',
    description: 'Plugin for analyzing BOM (Bill of Materials) data from CSV files',
    actions: [readCSV],
    evaluators: [],
    providers: [bomProvider]
};
