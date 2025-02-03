// index.js

// Cloudflare Workers automatically provide a global fetch, 
// so you don't need `import fetch from 'node-fetch';`

const url = 'https://www.bestbuy.com/gateway/graphql';

const headers = {
  'Host': 'www.bestbuy.com',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br, zstd',
  'Referer': 'https://www.bestbuy.com/site/nvidia-geforce-rtx-5090-32gb-gddr7-graphics-card-dark-gun-metal/6614151.p?skuId=6614151',
  'X-REQUEST-ID': 'add-on-selector',
  'X-CLIENT-ID': 'ATTACH-accessories-in-variations',
  'Content-Type': 'application/json',
  'Origin': 'https://www.bestbuy.com',
  'Connection': 'keep-alive',
  // Remove Node-only or extraneous headers like 'mode', 'TE', 'Priority', etc. 
};

const query = `
  query AOS_fetchButtonStateData($zip: String!, $store: String!) {
    productBySkuId(skuId: "6614151") {
      fulfillmentOptions(
        input: {
          buttonState: {context: PDP, destinationZipCode: $zip, storeId: $store},
          shipping: {destinationZipCode: $zip},
          inStorePickup: {storeId: $store}
        }
      ) {
        buttonStates {
          buttonState
          planButtonState
          displayText
          skuId
        }
      }
    }
  }
`;

// Add your store/zip combos here
const params = [
    { zip: "91316", store: "764" },
    { zip: "91316", store: "1180" },
    { zip: "91316", store: "393" },
    { zip: "91316", store: "137" },
    { zip: "91316", store: "109" },
    { zip: "91316", store: "116" },
    { zip: "91316", store: "1511" },
    { zip: "91316", store: "179" },
    { zip: "91316", store: "130" },
    { zip: "91316", store: "183" },
    { zip: "91316", store: "1510" },
    { zip: "91316", store: "104" },
    { zip: "91316", store: "1537" },
    { zip: "91316", store: "872" },
    { zip: "91316", store: "125" },
  ];

async function fetchGraphQL(zip, store) {
  const body = {
    query,
    variables: { zip, store },
    operationName: "AOS_fetchButtonStateData"
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error(`Error fetching for zip ${zip}, store ${store}:`, err);
    return null;
  }
}

// This checks each store exactly once and returns the first that isn’t SOLD_OUT.
async function checkAllStoresOnce() {
  for (const { zip, store } of params) {
    const data = await fetchGraphQL(zip, store);
    if (
      data &&
      data.data &&
      data.data.productBySkuId &&
      data.data.productBySkuId.fulfillmentOptions &&
      data.data.productBySkuId.fulfillmentOptions.buttonStates &&
      data.data.productBySkuId.fulfillmentOptions.buttonStates.length > 0
    ) {
      const buttonState = data.data.productBySkuId.fulfillmentOptions.buttonStates[0].buttonState;
      console.log(`Store: ${store} | Zip: ${zip} -> buttonState: ${buttonState}`);

      if (buttonState !== "SOLD_OUT") {
        return {
          zip,
          store,
          buttonState
        };
      }
    }
  }
  // If we get here, all were sold out or errored
  return null;
}

/**
 * The Cloudflare Worker entry point:
 *    - We get a request,
 *    - We run checkAllStoresOnce(),
 *    - We return a JSON response with the result
 */
export default {
  async fetch(request, env, ctx) {
    const result = await checkAllStoresOnce();
    if (result) {
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ message: "All stores SOLD_OUT or not available." }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
