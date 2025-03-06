import axios from 'axios';
import { getBTCPrice, updateFigmaVariables } from './btc-utils.js';

async function processConfigurations() {
  try {
    // Read configurations from environment
    const configs = JSON.parse(process.env.CONFIGS).configurations;
    
    // Get BTC price once for all updates
    const priceData = await getBTCPrice();
    if (!priceData) {
      console.error('❌ Failed to fetch BTC price');
      return;
    }
    console.log('✓ BTC price fetched:', priceData.price, 'EUR');

    // Process each enabled configuration
    for (const config of configs) {
      if (!config.enabled) {
        console.log(`⏭️  Skipping disabled config: ${config.id}`);
        continue;
      }

      // Check if it's time to update this configuration
      const shouldUpdate = config.interval <= 5; // For 5-minute schedule
      if (!shouldUpdate) {
        console.log(`⏭️  Skipping config ${config.id} (${config.interval}min interval)`);
        continue;
      }

      console.log(`\n🔄 Processing ${config.id}:`);
      await updateFigmaVariables(config, priceData);
    }
  } catch (error) {
    console.error('❌ Error processing configurations:', error);
    process.exit(1);
  }
}

// Run the updates
processConfigurations(); 