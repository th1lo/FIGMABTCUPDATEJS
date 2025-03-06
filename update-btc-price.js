import axios from 'axios';
import dotenv from 'dotenv';
import ora from 'ora';
import chalk from 'chalk';

// Load environment variables from .env file
dotenv.config();

// Add timestamp to logs
const timestamp = () => chalk.gray(`[${new Date().toLocaleTimeString()}]`);

// Spinner instance
const spinner = ora({
  text: 'Starting BTC price update...',
  color: 'yellow'
});

// Debug logging
const debugLog = (...args) => {
  if (process.env.DEBUG === 'true') {
    const spinnerWasSpinning = spinner.isSpinning;
    spinner.stop();
    console.log(timestamp(), chalk.blue('[DEBUG]'), ...args);
    if (spinnerWasSpinning) {
      spinner.start();
    }
  }
};

// Success logging
const successLog = (message) => {
  spinner.stop();
  console.log(timestamp(), chalk.green('✓'), message);
};

// Error logging
const errorLog = (message, error) => {
  spinner.stop();
  console.error(timestamp(), chalk.red('✗'), message);
  if (error && process.env.DEBUG === 'true') {
    console.error(chalk.red(error));
  }
};

// Helper function to get the current BTC price
const getBTCPrice = async () => {
  try {
    const response = await axios.get(process.env.BTC_API_URL);
    debugLog('BTC API Response:', response.data);

    if (response.data && response.data.RAW) {
      const priceData = response.data.RAW;
      return {
        price: priceData.PRICE.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'),
        change24h: priceData.CHANGE24HOUR.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'),
        changePct24h: priceData.CHANGEPCT24HOUR.toFixed(2),
        high24h: priceData.HIGH24HOUR.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'),
        low24h: priceData.LOW24HOUR.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'),
        lastUpdate: new Date(priceData.LASTUPDATE * 1000).toLocaleString(),
        market: priceData.LASTMARKET
      };
    } else {
      console.error('BTC price data not found in API response');
      return null;
    }
  } catch (error) {
    console.error('Error fetching BTC price:', error.message);
    return null;
  }
};

// Helper function to fetch collections
const fetchCollections = async () => {
  try {
    const collectionsResponse = await axios.get(`https://api.figma.com/v1/files/${process.env.FIGMA_FILE_KEY}/variables/local`, {
      headers: {
        'X-FIGMA-TOKEN': process.env.FIGMA_TOKEN
      }
    });

    debugLog('Collections fetched:', JSON.stringify(collectionsResponse.data, null, 2));

    // Check if the collection exists
    const collection = Object.values(collectionsResponse.data.meta.variableCollections)
      .find(coll => coll.name === process.env.FIGMA_COLLECTION_NAME);

    if (collection) {
      debugLog(`Found existing collection "${process.env.FIGMA_COLLECTION_NAME}"`);
      return collection.id;
    } else {
      spinner.text = `Creating new collection "${process.env.FIGMA_COLLECTION_NAME}"...`;
      await createCollection();
      
      // Fetch collections again to get the new collection's real ID
      const updatedCollections = await axios.get(`https://api.figma.com/v1/files/${process.env.FIGMA_FILE_KEY}/variables/local`, {
        headers: {
          'X-FIGMA-TOKEN': process.env.FIGMA_TOKEN
        }
      });
      
      const newCollection = Object.values(updatedCollections.data.meta.variableCollections)
        .find(coll => coll.name === process.env.FIGMA_COLLECTION_NAME);
      
      if (newCollection) {
        successLog(`Created new collection "${process.env.FIGMA_COLLECTION_NAME}"`);
        return newCollection.id;
      } else {
        throw new Error(`Failed to create collection "${process.env.FIGMA_COLLECTION_NAME}"`);
      }
    }
  } catch (error) {
    errorLog('Failed to access Figma collections', error);
    throw error;
  }
};

// Helper function to create a new collection
const createCollection = async () => {
  const tempId = 'temp_collection_id';
  const data = {
    variableCollections: [
      {
        action: 'CREATE',
        id: tempId,
        name: process.env.FIGMA_COLLECTION_NAME
      }
    ]
  };

  try {
    debugLog('Creating collection with payload:', JSON.stringify(data, null, 2));
    const response = await axios.post(`https://api.figma.com/v1/files/${process.env.FIGMA_FILE_KEY}/variables`, data, {
      headers: {
        'X-FIGMA-TOKEN': process.env.FIGMA_TOKEN
      }
    });
    debugLog('Collection created response:', JSON.stringify(response.data, null, 2));
    return response;
  } catch (error) {
    console.error('Error creating collection:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

// Helper function to create/update variables in Figma
const createOrUpdateVariables = async (collectionId, priceData) => {
  try {
    const collectionsResponse = await axios.get(`https://api.figma.com/v1/files/${process.env.FIGMA_FILE_KEY}/variables/local`, {
      headers: {
        'X-FIGMA-TOKEN': process.env.FIGMA_TOKEN
      }
    });

    const collection = collectionsResponse.data.meta.variableCollections[collectionId];
    if (!collection) {
      throw new Error(`Collection ${collectionId} not found`);
    }

    const defaultModeId = collection.defaultModeId;
    debugLog('Using default mode ID:', defaultModeId);

    // Define all variables we want to create/update
    const variableDefinitions = [
      { name: 'Price', value: priceData.price },
      { name: 'Change24h', value: `${priceData.change24h > 0 ? '+' : ''}${priceData.change24h}` },
      { name: 'ChangePct24h', value: `${priceData.changePct24h > 0 ? '+' : ''}${priceData.changePct24h}%` },
      { name: 'High24h', value: priceData.high24h },
      { name: 'Low24h', value: priceData.low24h },
      { name: 'LastUpdate', value: priceData.lastUpdate },
      { name: 'Market', value: priceData.market }
    ];

    // Find existing variables
    const existingVariables = Object.values(collectionsResponse.data.meta.variables)
      .filter(v => v.variableCollectionId === collectionId);

    // Prepare the update payload
    const data = {
      variables: variableDefinitions.map(def => {
        const existing = existingVariables.find(v => v.name === def.name);
        return {
          action: existing ? 'UPDATE' : 'CREATE',
          id: existing?.id || `temp_${def.name.toLowerCase()}_id`,
          name: def.name,
          variableCollectionId: collectionId,
          resolvedType: 'STRING'
        };
      }),
      variableModeValues: variableDefinitions.map(def => {
        const existing = existingVariables.find(v => v.name === def.name);
        return {
          modeId: defaultModeId,
          variableId: existing?.id || `temp_${def.name.toLowerCase()}_id`,
          value: def.value.toString()
        };
      })
    };

    debugLog('Updating variables with payload:', JSON.stringify(data, null, 2));
    const response = await axios.post(`https://api.figma.com/v1/files/${process.env.FIGMA_FILE_KEY}/variables`, data, {
      headers: {
        'X-FIGMA-TOKEN': process.env.FIGMA_TOKEN
      }
    });
    debugLog('Variables update response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error creating or updating variables:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

// Main script logic
const main = async () => {
  try {
    // Fetch BTC price
    spinner.start('Fetching current Bitcoin price...');
    const priceData = await getBTCPrice();
    if (!priceData) {
      errorLog('Could not fetch Bitcoin price, check your internet connection');
      return;
    }
    successLog('Bitcoin price data received');
    debugLog(`Current BTC price: ${priceData.price} EUR`);

    // Connect to Figma
    spinner.start('Connecting to Figma...');
    const collectionId = await fetchCollections();
    if (!collectionId) {
      errorLog('Could not access Figma, check your access token');
      return;
    }
    successLog('Connected to Figma successfully');

    // Update variables
    spinner.start('Updating Figma variables...');
    await createOrUpdateVariables(collectionId, priceData);
    successLog('Variables updated successfully');
    
    // Final success message
    successLog(`Current BTC price: ${priceData.price} EUR`);
  } catch (error) {
    errorLog('Failed to update Figma variables', error);
  }
};

// Add this helper function for formatting time
const formatTimeRemaining = (ms) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};

// Update the updateBTCPrice function
async function updateBTCPrice() {
  spinner.start('Starting price update...');
  
  try {
    await main();
    
    // Start countdown for next update
    const startTime = Date.now();
    const countdownInterval = setInterval(() => {
      const remaining = intervalInMs - (Date.now() - startTime);
      if (remaining <= 0) {
        clearInterval(countdownInterval);
        return;
      }
      spinner.start(`Next update in ${formatTimeRemaining(remaining)}`);
    }, 1000);

    // Clear the countdown when the next update starts
    setTimeout(() => {
      clearInterval(countdownInterval);
    }, intervalInMs);

  } catch (error) {
    errorLog('Update failed', error);
  }
}

// Update interval display
const intervalInMinutes = 5;
const intervalInMs = intervalInMinutes * 60 * 1000;

// Initial startup message
console.clear(); // Clear console for cleaner display
console.log(timestamp(), chalk.cyan('▶'), `BTC Price Tracker Started (Updates every ${intervalInMinutes} minutes)`);
updateBTCPrice();
setInterval(updateBTCPrice, intervalInMs);
