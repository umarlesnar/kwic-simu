const REDIS_URL =
  process.env.REDIS_URL ||
  "redis://default:mskjplwsi9823qposdkm@103.25.47.251:6389";
const Redis = require("ioredis");
const redis = new Redis(REDIS_URL);
console.log("Connecting to Redis at", REDIS_URL);

const wba_account = [
  {
    app_id: "1400000001",
    wba_id: "1100000001",
    catalog_id:"17000000001",
    phone_numbers: [
      {
        id: "12172328",
        display_phone_number: "+91 9000000031",
        verified_name: "TestBiz Inc",
        code_verification_status: "VERIFIED",
        quality_rating: "GREEN",
        platform_type: "CLOUD_API",
        throughput: { level: "STANDARD" },
        last_onboarded_time: "2025-02-19T12:49:49+0000",
        webhook_configuration: {
          whatsapp_business_account: "https://prev-kwic-dev.nekhop.com/webhook",
          application: "https://app.kwic.in/webhook",
        },
      },
    ],
  },
  {
    app_id: "1400000001",
    wba_id: "1100000002",
    catalog_id:"17000000002",
    phone_numbers: [
      {
        id: "120000001",
        display_phone_number: "+91 90000000021",
        verified_name: "Demo Business",
        code_verification_status: "VERIFIED",
        quality_rating: "GREEN",
        platform_type: "CLOUD_API",
        throughput: { level: "STANDARD" },
        last_onboarded_time: "2025-02-19T12:49:49+0000",
        webhook_configuration: {
          whatsapp_business_account: "https://prev-kwic-dev.nekhop.com/webhook",
          application: "https://app.kwic.in/webhook",
        },
      },
    ],
  },
  {
    app_id: "1400000001",
    wba_id: "1100000003",
    catalog_id:"17000000003",
    phone_numbers: [
      {
        id: "120000031",
        display_phone_number: "+91 9000000031",
        verified_name: "QA Mart",
        code_verification_status: "VERIFIED",
        quality_rating: "GREEN",
        platform_type: "CLOUD_API",
        throughput: { level: "STANDARD" },
        last_onboarded_time: "2025-02-19T12:49:49+0000",
        webhook_configuration: {
          whatsapp_business_account: "https://prev-kwic-dev.nekhop.com/webhook",
          application: "https://app.kwic.in/webhook",
        },
      },
      {
        id: "120000032",
        display_phone_number: "+91 9000000032",
        verified_name: "Testing Account",
        code_verification_status: "VERIFIED",
        quality_rating: "GREEN",
        platform_type: "CLOUD_API",
        throughput: { level: "STANDARD" },
        last_onboarded_time: "2025-02-19T12:49:49+0000",
        webhook_configuration: {
          whatsapp_business_account: "https://prev-kwic-dev.nekhop.com/webhook",
          application: "https://app.kwic.in/webhook",
        },
      },
      {
        id: "120000033",
        display_phone_number: "+91 9000000033",
        verified_name: "Sandbox Traders",
        code_verification_status: "VERIFIED",
        quality_rating: "GREEN",
        platform_type: "CLOUD_API",
        throughput: { level: "STANDARD" },
        last_onboarded_time: "2025-02-19T12:49:49+0000",
        webhook_configuration: {
          whatsapp_business_account: "https://prev-kwic-dev.nekhop.com/webhook",
          application: "https://app.kwic.in/webhook",
        },
      },
      {
        id: "120000034",
        display_phone_number: "+91 9000000034",
        verified_name: "Dev Solutions Co.",
        code_verification_status: "VERIFIED",
        quality_rating: "GREEN",
        platform_type: "CLOUD_API",
        throughput: { level: "STANDARD" },
        last_onboarded_time: "2025-02-19T12:49:49+0000",
        webhook_configuration: {
          whatsapp_business_account: "https://prev-kwic-dev.nekhop.com/webhook",
          application: "https://app.kwic.in/webhook",
        },
      },
    ],
  },
];

const whatsappclients = [
  {
    profile: {
      name: "Subramani",
    },
    wa_id: "919500999967",
  },
];

const catalogs = [
  {
    catalog_id: "17000000001",
    catalog_name: "Catalog 1",
    products: [
      {
          id: "18000000001",
          retailer_id: "19000000001",
          name: "Men Cotton Orange Half Sleeves Expert Tee ET19",
          description:
            "* Introducing our Men's Orange Half-Sleeves Expert T-Shirt, designed for ultimate comfort and style. Made with high-quality cotton, it's soft and keeps its shape well. Whether you're lounging at home or out for a casual day, this shirt is perfect.",
          availability: "in stock",
          condition: "new",
          price: "₹385.00",
          url: "https://kwic-ai-dev.myshopify.com/products/men-cotton-orange-half-sleeves-expert-tee-et19?utm_content=Facebook_UA&utm_source=facebook&variant=50784282149153",
          image_url:
            "https://cdn.shopify.com/s/files/1/0913/4293/0209/files/roundpolo2_1080x1080_pad_ffffff.webp.jpg?v=1736597868",
          brand: "kwic-ai-dev",
          product_catalog: {
            id: "17000000001",
            name: "Shopify Product Catalog",
          },
      }
    ],
  },
  {
    catalog_id: "17000000002",
    catalog_name: "Catalog 2",
    products: [
      {
        id: "18000000002",
        retailer_id: "19000000002",
        name: "Men Cotton Orange Half Sleeves Expert Tee ET19",
        description:
          "* Introducing our Men's Orange Half-Sleeves Expert T-Shirt, designed for ultimate comfort and style. Made with high-quality cotton, it's soft and keeps its shape well. Whether you're lounging at home or out for a casual day, this shirt is perfect.",
        availability: "in stock",
        condition: "new",
        price: "₹385.00",
        url: "https://kwic-ai-dev.myshopify.com/products/men-cotton-orange-half-sleeves-expert-tee-et19?utm_content=Facebook_UA&utm_source=facebook&variant=50784282149153",
        image_url:
          "https://cdn.shopify.com/s/files/1/0913/4293/0209/files/roundpolo2_1080x1080_pad_ffffff.webp.jpg?v=1736597868",
        brand: "kwic-ai-dev",
        product_catalog: {
          id: "17000000002",
          name: "Shopify Product Catalog",
        },
    }
    ],
  },
  {
    catalog_id: "17000000003",
    catalog_name: "Catalog 3",
    products: [
      {
        id: "18000000003",
        retailer_id: "19000000003",
        name: "Men Cotton Orange Half Sleeves Expert Tee ET19",
        description:
          "* Introducing our Men's Orange Half-Sleeves Expert T-Shirt, designed for ultimate comfort and style. Made with high-quality cotton, it's soft and keeps its shape well. Whether you're lounging at home or out for a casual day, this shirt is perfect.",
        availability: "in stock",
        condition: "new",
        price: "₹385.00",
        url: "https://kwic-ai-dev.myshopify.com/products/men-cotton-orange-half-sleeves-expert-tee-et19?utm_content=Facebook_UA&utm_source=facebook&variant=50784282149153",
        image_url:
          "https://cdn.shopify.com/s/files/1/0913/4293/0209/files/roundpolo2_1080x1080_pad_ffffff.webp.jpg?v=1736597868",
        brand: "kwic-ai-dev",
        product_catalog: {
          id: "17000000003",
          name: "Shopify Product Catalog",
        },
    }
    ]
  },
];

// Function to load data into Redis
async function loadMockData() {
  try {
    // for (const app of wba_account) {
    //   const redisKey = `app-${app.app_id}-${app.wba_id}`;

    //   for (const phoneNumber of app.phone_numbers) {
    //     await redis.lpush(redisKey, JSON.stringify(phoneNumber));
    //   }
    // }
    for (const app of wba_account) {
      for (const phoneNumber of app.phone_numbers) {
        const redisKey = `whatsapp:${app.wba_id}:${phoneNumber.id}`;
        const catalogKey = `catalog:${app.catalog_id}`;

        //find catalog
        const catalog = catalogs.find((c) => c.catalog_id === app.catalog_id);
        if (catalog) {
          await redis.set(catalogKey, JSON.stringify(catalog));
        }
        
        await redis.set(
          redisKey,
          JSON.stringify({
            ...phoneNumber,
            wba_id: app.wba_id,
            app_id: app.app_id,
            catalog_id: app.catalog_id,
          })
        );
      }
    }

    for (const wba_id of whatsappclients) {
      const redisKey = `client-whatssapp-${wba_id.wa_id}`;
      await redis.set(redisKey, JSON.stringify(wba_id));
    }

    const list = await redis.lrange("app-1400000001-1100000003", 0, -1);

    console.log("✅ Mock data loaded into Redis.", list);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error inserting data into Redis:", error);
    process.exit(1);
  }
}

// Run the function
loadMockData();
