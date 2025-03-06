import axios from 'axios';

export async function getBTCPrice() {
  try {
    const response = await axios.get('https://min-api.cryptocompare.com/data/generateAvg?fsym=BTC&tsym=EUR&e=coinbase');
    
    if (response.data && response.data.RAW) {
      const priceData = response.data.RAW;
      return {
        price: priceData.PRICE.toFixed(2),
        change24h: priceData.CHANGE24HOUR.toFixed(2),
        changePct24h: priceData.CHANGEPCT24HOUR.toFixed(2),
        high24h: priceData.HIGH24HOUR.toFixed(2),
        low24h: priceData.LOW24HOUR.toFixed(2),
        lastUpdate: new Date(priceData.LASTUPDATE * 1000).toLocaleString(),
        market: priceData.LASTMARKET
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching BTC price:', error.message);
    return null;
  }
}

export async function updateFigmaVariables(config, priceData) {
  try {
    // First get or create collection
    const collectionId = await getOrCreateCollection(config);
    if (!collectionId) return;

    // Update variables
    await updateVariables(config, collectionId, priceData);
    console.log(`✓ Updated variables for ${config.id}`);
  } catch (error) {
    console.error(`❌ Failed to update ${config.id}:`, error.message);
  }
}

async function getOrCreateCollection(config) {
  try {
    const collectionsResponse = await axios.get(
      `https://api.figma.com/v1/files/${config.figmaFileKey}/variables/local`,
      {
        headers: {
          'X-FIGMA-TOKEN': config.figmaToken
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
          'X-FIGMA-TOKEN': config.figmaToken
        }
      }
    );

    // Get the new collection ID
    const updatedCollections = await axios.get(
      `https://api.figma.com/v1/files/${config.figmaFileKey}/variables/local`,
      {
        headers: {
          'X-FIGMA-TOKEN': config.figmaToken
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
    console.error('❌ Failed to access/create collection:', error.message);
    return null;
  }
}

async function updateVariables(config, collectionId, priceData) {
  try {
    const collectionsResponse = await axios.get(
      `https://api.figma.com/v1/files/${config.figmaFileKey}/variables/local`,
      {
        headers: {
          'X-FIGMA-TOKEN': config.figmaToken
        }
      }
    );

    const collection = collectionsResponse.data.meta.variableCollections[collectionId];
    if (!collection) {
      throw new Error('Collection not found');
    }

    const defaultModeId = collection.defaultModeId;

    // Define variables to update
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

    // Prepare update payload
    const updatePayload = {
      variables: variableDefinitions.map(def => ({
        action: existingVariables.find(v => v.name === def.name) ? 'UPDATE' : 'CREATE',
        id: existingVariables.find(v => v.name === def.name)?.id || `temp_${def.name.toLowerCase()}_id`,
        name: def.name,
        variableCollectionId: collectionId,
        resolvedType: 'STRING'
      })),
      variableModeValues: variableDefinitions.map(def => ({
        variableId: existingVariables.find(v => v.name === def.name)?.id || `temp_${def.name.toLowerCase()}_id`,
        modeId: defaultModeId,
        value: def.value.toString()
      }))
    };

    // Update variables
    await axios.post(
      `https://api.figma.com/v1/files/${config.figmaFileKey}/variables`,
      updatePayload,
      {
        headers: {
          'X-FIGMA-TOKEN': config.figmaToken
        }
      }
    );

  } catch (error) {
    console.error('❌ Failed to update variables:', error.message);
    throw error;
  }
} 