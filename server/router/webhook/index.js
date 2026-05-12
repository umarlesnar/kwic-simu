const express = require("express");
const WebhookRouter = express.Router();

WebhookRouter.post("/push", async (req, res) => {
  const message = req.body;
  const result = await req.redisStreamManager.sendMessage({
    type: "WEBHOOK",
    payload: message,
  });

  res.json({
    success: true,
  });
});

module.exports = WebhookRouter;
