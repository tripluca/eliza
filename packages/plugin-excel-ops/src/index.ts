import { Plugin } from '@elizaos/core';
import { readCSV } from './actions/readCSV';

const excelOpsPlugin: Plugin = {
    name: 'excel-ops',
    description: 'Excel operations plugin for Eliza - Handles CSV file processing and modifications',
    actions: [readCSV]
};

export default excelOpsPlugin;
