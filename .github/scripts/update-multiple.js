import axios from 'axios';
import { getBTCPrice, updateFigmaVariables } from './btc-utils.js';

async function processConfigurations() {
  try {
    console.log('🚀 Starting BTC Price Update job');
    
    const configJson = process.env.CONFIGS;
    if (!configJson) {
      throw new Error('No configurations found');
    }

    const configs = JSON.parse(configJson).configurations;
    console.log(`📋 Found ${configs.length} configuration(s)`);
    
    const priceData = await getBTCPrice();
    if (!priceData) {
      throw new Error('Failed to fetch BTC price');
    }
    console.log('💰 BTC price fetched:', priceData.price, 'EUR');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const config of configs) {
      console.log(`\n📌 Processing configuration: ${config.id}`);
      console.log(`   File: ${config.figmaFileKey}`);
      console.log(`   Collection: ${config.collectionName}`);
      console.log(`   Interval: ${config.interval} minutes`);
      console.log(`   Status: ${config.enabled ? 'Enabled' : 'Disabled'}`);

      if (!config.enabled) {
        console.log('⏭️  Skipping disabled configuration');
        skipCount++;
        continue;
      }

      try {
        if (config.interval === 5) {
          console.log('🔄 Updating...');
          await updateFigmaVariables(config, priceData);
          successCount++;
          console.log('✅ Update successful');
        } else {
          const currentMinute = parseInt(process.env.CURRENT_MINUTE || '0');
          const shouldUpdate = currentMinute % config.interval === 0;
          
          if (shouldUpdate) {
            console.log('🔄 Updating...');
            await updateFigmaVariables(config, priceData);
            successCount++;
            console.log('✅ Update successful');
          } else {
            console.log('⏭️  Skipping (not scheduled for this interval)');
            skipCount++;
          }
        }
      } catch (error) {
        console.error('❌ Update failed:', error.message);
        errorCount++;
        continue; // Skip to next config on error
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Success: ${successCount}`);
    console.log(`   Skipped: ${skipCount}`);
    console.log(`   Errors: ${errorCount}`);

    if (errorCount > 0) {
      throw new Error(`Failed to update ${errorCount} configuration(s)`);
    }

  } catch (error) {
    console.error('\n❌ Job failed:', error.message);
    process.exit(1);
  }
}

processConfigurations(); 