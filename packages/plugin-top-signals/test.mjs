import { TopSignalsPlugin } from './dist/index.js';

async function testCommands() {
  const plugin = new TopSignalsPlugin();
  const commands = plugin.getCommands();

  console.log('\n--- Testing list-signals ---');
  console.log(await commands[1].handler({}));

  console.log('\n--- Testing report-signal ---');
  console.log(await commands[0].handler({
    options: {
      getString: () => 'tiktok_trading_experts'
    },
    user: { id: 'test-user' }
  }));

  console.log('\n--- Testing active-signals ---');
  console.log(await commands[2].handler({}));

  console.log('\n--- Testing remove-signal ---');
  console.log(await commands[3].handler({
    options: {
      getString: () => 'tiktok_trading_experts'
    },
    user: { id: 'test-user' }
  }));
}

testCommands().catch(console.error); 