const axios = require("axios");
const xlsx = require("xlsx");
const fs = require("fs");

const WEBHOOK_URL = "https://prev-kwic-dev.nekhop.com/webhook"; // Replace with your actual webhook URL
const FILE_PATH = "data.xlsx"; // Replace with your Excel file path
const CONCURRENCY = 1000; // Adjust based on server capacity

const workbook = xlsx.readFile(FILE_PATH);
const sheetName = workbook.SheetNames[0];
const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

let successCount = 0;
let failureCount = 0;

const generateRandomString = () => Math.random().toString(36).substring(2, 15);

const preprocessMessage = (entry) => {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: entry.wba_id.toString(),
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: entry.display_phone_number.toString(),
                phone_number_id: entry.phone_number_id.toString(),
              },
              contacts: [
                {
                  profile: {
                    name: entry.profileName,
                  },
                  wa_id: entry.wa_id.toString(),
                },
              ],
              messages: [
                {
                  from: entry.wa_id.toString(),
                  id: "wamid." + generateRandomString(),
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  text: {
                    body: entry.textBody,
                  },
                  type: "text",
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
  };
};

const sendRequest = async (entry, index) => {
  try {
    const message = preprocessMessage(entry);
    console.log(`Sending request: ${index}`, JSON.stringify(message));
    const response = await axios.post(WEBHOOK_URL, message);
    console.log(`Success: ${index} - Status: ${response.status}`);
    successCount++;
  } catch (error) {
    console.error(`Error: ${index} -`, error.message);
    failureCount++;
  }
};

const sendRequestsInBatches = async () => {
  let batch = [];
  for (let i = 0; i < data.length; i++) {
    batch.push(sendRequest(data[i], i));
    if (batch.length >= CONCURRENCY) {
      await Promise.all(batch);
      batch = [];
    }
  }
  if (batch.length > 0) {
    await Promise.all(batch);
  }

  console.log(
    `Load test completed. Success: ${successCount}, Failed: ${failureCount}`
  );
  fs.writeFileSync(
    "report.json",
    JSON.stringify({ success: successCount, failed: failureCount }, null, 2)
  );
};

console.log("Starting load test...");
sendRequestsInBatches();
