import { execSync } from "child_process";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env from server directory
config({ path: resolve(process.cwd(), ".env") });

const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION } = process.env;

if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION) {
  console.error("Missing AWS credentials in .env file");
  console.error("Required: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION");
  process.exit(1);
}

try {
  execSync(`aws configure set aws_access_key_id ${AWS_ACCESS_KEY_ID}`, { stdio: "inherit" });
  execSync(`aws configure set aws_secret_access_key ${AWS_SECRET_ACCESS_KEY}`, { stdio: "inherit" });
  execSync(`aws configure set region ${AWS_REGION}`, { stdio: "inherit" });
  console.log("✅ AWS CLI configured from .env variables");
} catch (error) {
  console.error("Failed to configure AWS CLI:", error);
  process.exit(1);
}
