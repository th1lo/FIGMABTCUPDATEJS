import axios from 'axios';

// Add timestamp function at the top
const timestamp = () => {
  const now = new Date();
  return now.toLocaleString('en-US', {
    hour12: false,
    timeZone: 'Europe/Berlin',
    timeZoneName: 'short'
  });
};

export async function getBTCPrice() {
  try {
    const response = await axios.get('https://min-api.cryptocompare.com/data/generateAvg?fsym=BTC&tsym=EUR&e=coinbase');
    
    if (response.data && response.data.RAW) {
      const priceData = response.data.RAW;
      return {
        price: priceData.PRICE.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }),
        change24h: priceData.CHANGE24HOUR.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          signDisplay: 'exceptZero'
        }),
        changePct24h: priceData.CHANGEPCT24HOUR.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          signDisplay: 'exceptZero'
        }),
        high24h: priceData.HIGH24HOUR.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }),
        low24h: priceData.LOW24HOUR.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }),
        lastUpdate: new Date(priceData.LASTUPDATE * 1000).toLocaleString('en-US', {
          hour12: false,
          timeZone: 'Europe/Berlin',
          timeZoneName: 'short'
        }),
        market: priceData.LASTMARKET
      };
    }
    return null;
  } catch (error) {
    console.error(`[${timestamp()}] Error fetching BTC price:`, error.message);
    return null;
  }
}

export async function updateFigmaVariables(config, priceData) {
  try {
    // First get or create collection
    const collectionId = await getOrCreateCollection(config);
    if (!collectionId) {
      throw new Error('Failed to get/create collection');
    }

    // Update variables
    await updateVariables(config, collectionId, priceData);
    return true; // Success
  } catch (error) {
    console.error(`❌ Error updating ${config.id}:`, {
      message: error.message,
      status: error.response?.status,
      details: error.response?.data
    });
    throw error; // Re-throw to handle in the main script
  }
}

async function getOrCreateCollection(config) {
  try {
    // Add debug logging
    console.log('Attempting to access Figma file:', config.figmaFileKey);
    const decryptedToken = decryptToken(config.figmaToken);
    console.log('Token length:', decryptedToken.length);
    
    const collectionsResponse = await axios.get(
      `https://api.figma.com/v1/files/${config.figmaFileKey}/variables/local`,
      {
        headers: {
          'X-FIGMA-TOKEN': decryptedToken
        }
      }
    );

    // Check if collection exists
    const collection = Object.values(collectionsResponse.data.meta.variableCollections)
      .find(coll => coll.name === config.collectionName);

    if (collection) {
      console.log(`✓ Found collection "${config.collectionName}"`);
      return collection.id;
    }

    // Create new collection if it doesn't exist
    console.log(`Creating new collection "${config.collectionName}"...`);
    const createResponse = await axios.post(
      `https://api.figma.com/v1/files/${config.figmaFileKey}/variables`,
      {
        variableCollections: [{
          action: 'CREATE',
          id: 'temp_collection_id',
          name: config.collectionName
        }]
      },
      {
        headers: {
          'X-FIGMA-TOKEN': decryptedToken
        }
      }
    );

    // Get the new collection ID
    const updatedCollections = await axios.get(
      `https://api.figma.com/v1/files/${config.figmaFileKey}/variables/local`,
      {
        headers: {
          'X-FIGMA-TOKEN': decryptedToken
        }
      }
    );

    const newCollection = Object.values(updatedCollections.data.meta.variableCollections)
      .find(coll => coll.name === config.collectionName);

    if (newCollection) {
      console.log(`✓ Created collection "${config.collectionName}"`);
      return newCollection.id;
    }

    throw new Error('Failed to create collection');
  } catch (error) {
    // Add more detailed error logging
    console.error('❌ Detailed error:', {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    return null;
  }
}

// Add decryption helper
function decryptToken(encrypted) {
  return atob(encrypted);
}

// Update the updateVariables function
async function updateVariables(config, collectionId, priceData) {
  try {
    const decryptedToken = decryptToken(config.figmaToken);
    const collectionsResponse = await axios.get(
      `https://api.figma.com/v1/files/${config.figmaFileKey}/variables/local`,
      {
        headers: {
          'X-FIGMA-TOKEN': decryptedToken
        }
      }
    );

    const collection = collectionsResponse.data.meta.variableCollections[collectionId];
    if (!collection) {
      throw new Error('Collection not found');
    }

    console.log('📝 Preparing to update variables...');
    const defaultModeId = collection.defaultModeId;

    // Find existing variables
    const existingVariables = Object.values(collectionsResponse.data.meta.variables)
      .filter(v => v.variableCollectionId === collectionId);

    console.log('Found existing variables:', existingVariables.map(v => v.name).join(', ') || 'none');

    // Define variables to update or create
    const variableDefinitions = [
      { name: 'Price', type: 'STRING', value: priceData.price },
      { name: 'Change 24h', type: 'STRING', value: priceData.change24h },
      { name: 'Change % 24h', type: 'STRING', value: `${priceData.changePct24h}%` },
      { name: 'High 24h', type: 'STRING', value: priceData.high24h },
      { name: 'Low 24h', type: 'STRING', value: priceData.low24h },
      { name: 'Last Update', type: 'STRING', value: priceData.lastUpdate },
      { name: 'Market', type: 'STRING', value: priceData.market }
    ];

    // Prepare the update payload according to the API documentation
    const updatePayload = {
      // Create or update variable definitions
      variables: variableDefinitions.map(def => {
        const existingVar = existingVariables.find(v => v.name === def.name);
        if (!existingVar) {
          // Create new variable
          return {
            action: 'CREATE',
            id: `temp_${def.name.toLowerCase().replace(/\s+/g, '_')}_id`,
            name: def.name,
            resolvedType: def.type,
            variableCollectionId: collectionId,
            scopes: ['TEXT_CONTENT'], // Scope for string variables
            codeSyntax: {
              WEB: def.name.toLowerCase().replace(/\s+/g, '_'),
            }
          };
        }
        return null; // Skip existing variables
      }).filter(Boolean),

      // Update all variable values
      variableModeValues: variableDefinitions.map(def => {
        const existingVar = existingVariables.find(v => v.name === def.name);
        return {
          variableId: existingVar ? existingVar.id : `temp_${def.name.toLowerCase().replace(/\s+/g, '_')}_id`,
          modeId: defaultModeId,
          value: def.value.toString()
        };
      })
    };

    // Only send the request if there are changes to make
    if (updatePayload.variables.length > 0 || updatePayload.variableModeValues.length > 0) {
      console.log(`Updating ${updatePayload.variableModeValues.length} variable values...`);
      
      const updateResponse = await axios.post(
        `https://api.figma.com/v1/files/${config.figmaFileKey}/variables`,
        updatePayload,
        {
          headers: {
            'X-FIGMA-TOKEN': decryptedToken
          }
        }
      );

      if (!updateResponse.data) {
        throw new Error('No response from Figma API');
      }

      console.log('✅ Variables updated successfully');
      return true;
    } else {
      console.log('⚠️ No variables to update');
      return false;
    }
  } catch (error) {
    console.error('❌ Variable update error:', {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    throw error;
  }
} 