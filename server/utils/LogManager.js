const winston = require("winston");
require("winston-cloudwatch");

// Define LogManager class for structured logging and sending logs to multiple destinations
class LogManager {
  constructor() {
    this.logger = winston.createLogger({
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        // Console Transport for local development (Optional)
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),

        // CloudWatch Transport for AWS CloudWatch
        // new winston.transports.CloudWatch({
        //   logGroupName: "express-app-logs",
        //   logStreamName: "app-stream",
        //   awsRegion: "us-east-1", // Your AWS region
        //   createLogGroup: true,
        //   createLogStream: true,
        // }),

        // Splunk Transport for sending logs to Splunk
        // new winston.transports.Http({
        //   level: "info",
        //   host: "http://your-splunk-url", // Splunk HTTP Event Collector URL
        //   path: "/services/collector/event",
        //   auth: {
        //     username: "your-username",
        //     password: "your-password",
        //   },
        // }),
      ],
    });
  }

  // Log an info message
  info(message) {
    this.logger.info(message);
  }

  // Log an error message
  error(message) {
    this.logger.error(message);
  }

  // Log a warning message
  warn(message) {
    this.logger.warn(message);
  }
}

module.exports = LogManager;
