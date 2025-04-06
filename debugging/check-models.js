const fs = require('fs');
const path = require('path');

// Get all character files
const charactersDir = path.join(__dirname, '../characters');
const characterFiles = fs.readdirSync(charactersDir)
  .filter(file => file.endsWith('.character.json'));

console.log('=== CHARACTER MODEL CONFIGURATIONS ===');

characterFiles.forEach(file => {
  try {
    const characterPath = path.join(charactersDir, file);
    const character = JSON.parse(fs.readFileSync(characterPath, 'utf8'));
    
    console.log(`\n[${character.name}]`);
    console.log(`- Model Provider: ${character.modelProvider || 'Not specified'}`);
    
    if (character.modelSettings) {
      console.log(`- Model: ${character.modelSettings.model || 'Not specified'}`);
      
      // Check for extended thinking
      if (character.modelSettings.thinking) {
        console.log(`- Extended Thinking: Enabled`);
        console.log(`  - Budget: ${character.modelSettings.thinking.budget_tokens} tokens`);
      } else if (character.modelSettings.stream_options?.thinking) {
        console.log(`- Extended Thinking: ${character.modelSettings.stream_options.thinking}`);
      } else {
        console.log(`- Extended Thinking: Not configured`);
      }
      
      // Check for beta features
      if (character.modelSettings.anthropicBeta) {
        console.log(`- Beta Features: ${character.modelSettings.anthropicBeta}`);
      }
    } else {
      console.log(`- No model settings specified`);
    }
  } catch (error) {
    console.error(`Error processing ${file}: ${error.message}`);
  }
});

console.log('\n=== END OF CHARACTER CONFIGURATIONS ==='); 