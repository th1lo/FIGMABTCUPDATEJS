import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Helper function to get the current BTC price
const getBTCPrice = async () => {
  try {
    const response = await axios.get(process.env.BTC_API_URL);
    console.log('BTC API Response:', response.data);

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

    console.log('Collections fetched:', JSON.stringify(collectionsResponse.data, null, 2));

    // Check if the collection exists
    const collection = Object.values(collectionsResponse.data.meta.variableCollections)
      .find(coll => coll.name === process.env.FIGMA_COLLECTION_NAME);

    if (collection) {
      console.log(`Collection ${process.env.FIGMA_COLLECTION_NAME} found with ID:`, collection.id);
      return collection.id;
    } else {
      console.log(`Collection ${process.env.FIGMA_COLLECTION_NAME} not found. Creating a new one...`);
      
      // Create new collection and immediately fetch the updated collections
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
        console.log('New collection found with ID:', newCollection.id);
        return newCollection.id;
      } else {
        throw new Error('Failed to find newly created collection');
      }
    }
  } catch (error) {
    console.error('Error in fetchCollections:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
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
    console.log('Creating collection with payload:', JSON.stringify(data, null, 2));
    const response = await axios.post(`https://api.figma.com/v1/files/${process.env.FIGMA_FILE_KEY}/variables`, data, {
      headers: {
        'X-FIGMA-TOKEN': process.env.FIGMA_TOKEN
      }
    });
    console.log('Collection created response:', JSON.stringify(response.data, null, 2));
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
    console.log('Using default mode ID:', defaultModeId);

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

    console.log('Updating variables with payload:', JSON.stringify(data, null, 2));
    const response = await axios.post(`https://api.figma.com/v1/files/${process.env.FIGMA_FILE_KEY}/variables`, data, {
      headers: {
        'X-FIGMA-TOKEN': process.env.FIGMA_TOKEN
      }
    });
    console.log('Variables update response:', JSON.stringify(response.data, null, 2));
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
    const priceData = await getBTCPrice();
    if (!priceData) {
      console.log('No BTC price data found, aborting...');
      return;
    }

    const collectionId = await fetchCollections();
    if (!collectionId) {
      console.log('Failed to get a valid collection ID, aborting...');
      return;
    }

    await createOrUpdateVariables(collectionId, priceData);

    console.log('BTC Price update successful');
  } catch (error) {
    console.error('Error during script execution:', error.message);
  }
};

// Function to update BTC price
async function updateBTCPrice() {
  try {
    // Your existing update logic here
    console.log('Updating BTC price...');
    await createOrUpdateVariables(collectionId, priceData);
    console.log('Update completed successfully');
  } catch (error) {
    console.error('Error updating BTC price:', error);
  }
}

// Execute immediately on start
updateBTCPrice();

// Then set up the interval
const intervalInMinutes = 5; // Default: 5 minutes
const intervalInMs = intervalInMinutes * 60 * 1000;

setInterval(updateBTCPrice, intervalInMs);

console.log(`Script started! Will update every ${intervalInMinutes} minutes.`);
