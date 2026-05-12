class RedisManager {
  constructor(redis) {
    this.redisClient = redis;
  }
  // Generate key dynamically based on type and ID
  getKey(type, id) {
    const keyPrefixes = {
      webhook: `webhook:${id}`,
      business: `business_id:own:${id}`,
      whatsapp: `whatsapp:client:${id}`,
      whatsappBusiness: `whatsapp:business:${id}`,
      whatsappBusinessNumber: `whatsapp:business_number:${id}`,
      message: `message:${id}`,
      template: `template:${id}`,
      media: `media:${id}`,
      fileUpload: `file_upload:${id}`,
      app: `app:${id}`,
      wb: `wb:${id}`,
      user: `user:${id}`,
    };
    return keyPrefixes[type] || null;
  }

  // Scan keys based on pattern (Efficient for large datasets)
  async getKeysByPattern(pattern) {
    let cursor = "0";
    let matchingKeys = [];

    do {
      const result = await this.redisClient.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        1000
      );
      cursor = result[0]; // Update cursor position
      matchingKeys.push(...result[1]); // Append found keys
    } while (cursor !== "0"); // Loop until the cursor resets to 0

    return matchingKeys;
  }

  // Get values for keys matching the pattern
  async getValuesByPattern(pattern) {
    const keys = await this.getKeysByPattern(pattern);
    const values = await Promise.all(
      keys.map(async (key) => {
        const value = await this.redisClient.get(key);
        return { key, value };
      })
    );

    return values;
  }

  // Get values for keys matching the pattern
  async getListValuesByPattern(pattern) {
    const keys = await this.getKeysByPattern(pattern);

    const values = await Promise.all(
      keys.map(async (key) => {
        const value = await this.getLitByKey(key);
        return { key, value };
      })
    );

    return values;
  }

  // Create or Update a value in Redis
  async put(type, id, value, ttlInSeconds = 3600) {
    const key = this.getKey(type, id);
    if (!key) {
      console.error("Invalid key type provided.");
      return;
    }

    await this.redisClient.set(key, JSON.stringify(value));

    if (ttlInSeconds > 0) {
      await this.redisClient.expire(key, ttlInSeconds);
    }
  }

  // Create or Update a value in Redis
  async putByKey(key, value, ttlInSeconds = 3600) {
    await this.redisClient.set(key, JSON.stringify(value));

    if (ttlInSeconds > 0) {
      await this.redisClient.expire(key, ttlInSeconds);
    }
  }

  async getByKey(key) {
    const value = await this.redisClient.get(key);
    return value ? JSON.parse(value) : null;
  }

  async getLitByKey(key) {
    const value = await this.redisClient.lrange(key, 0, -1);
    return value ? value.map((item) => JSON.parse(item)) : null;
  }

  // Read value from Redis
  async get(type, id) {
    const key = this.getKey(type, id);
    if (!key) {
      console.error("Invalid key type provided.");
      return null;
    }

    const value = await this.redisClient.get(key);
    return value ? JSON.parse(value) : null;
  }

  // Read has value from Redis
  async hget(key) {
    const value = await this.redisClient.hgetall(key);
    return value;
  }

  // Delete a key from Redis
  async delete(type, id) {
    const key = this.getKey(type, id);
    if (!key) {
      console.error("Invalid key type provided.");
      return;
    }

    await this.redisClient.del(key);
    console.log(`Deleted ${type} data with ID ${id}`);
  }

  // Set expiration for a key
  async setExpiration(type, id, ttlInSeconds) {
    const key = this.getKey(type, id);
    if (!key) {
      console.error("Invalid key type provided.");
      return;
    }

    await this.redisClient.expire(key, ttlInSeconds);
    console.log(`Set expiration for ${type}:${id} to ${ttlInSeconds} seconds`);
  }

  // Set expiration for a key
  async getClient() {
    return this.redisClient;
  }
  // Check if a key exists in Redis
  async exists(type, id) {
    const key = this.getKey(type, id);
    if (!key) {
      console.error("Invalid key type provided.");
      return false;
    }

    const exists = await this.redisClient.exists(key);
    return exists === 1;
  }
}

module.exports = RedisManager;
