import fetch from 'node-fetch';

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
  'mode': 'cors',
  'Origin': 'https://www.bestbuy.com',
  'Connection': 'keep-alive',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'Priority': 'u=4',
  'TE': 'trailers'
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

//CHANGE YOUR STORES HERE
const params = [
    { zip: "80487", store: "382" },
    { zip: "80487", store: "1079" },
    { zip: "80487", store: "693" },
    { zip: "80487", store: "164" },
    { zip: "80487", store: "1224" },
    { zip: "80487", store: "210" },
    { zip: "80487", store: "1416" },
    { zip: "80487", store: "211" },
    { zip: "80487", store: "225" },
    { zip: "80487", store: "1124" },
    { zip: "80487", store: "1194" },
    { zip: "80487", store: "298" },
    { zip: "80487", store: "212" },
    { zip: "80487", store: "1171" },
    { zip: "80487", store: "1031" },
  ];

let lines = 0;
let found = false;
let winningResult = null;

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

async function pollStore(zip, store) {
  console.log(`Starting poll for zip ${zip} and store ${store}...`);
  while (!found) {
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
      console.log(`Store: ${store} Ship to: ${zip} -> buttonState: ${buttonState}`);
      if (buttonState !== "SOLD_OUT") {
        found = true;
        winningResult = { zip, store, buttonState, data };
        return winningResult;
      }
    } else {
      console.log(`Incomplete data for zip ${zip}, store ${store}.`);
    }
    lines++
    if(lines > 30) {
        lines = 0;
        process.stdout.write('\x1B[3J\x1B[2J\x1B[H');
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return null;
}

async function runAllPollers() {
  const pollers = params.map(({ zip, store }) => pollStore(zip, store));
  const result = await Promise.race(pollers);
  console.log("Found a store with available button state:");
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

runAllPollers();
