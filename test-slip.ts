import fs from "fs";
import { analyzeSlipImage } from "./src/lib/server/slipCheck";

async function main() {
  const args = process.argv.slice(2);
  const imagePath = args[0];
  const expectedAmount = parseFloat(args[1] || "0");
  const expectedReceiverAccount = args[2] || "";
  const expectedReceiverName = args[3] || "";

  if (!imagePath) {
    console.error("Usage: npx tsx test-slip.ts <image_path> [expected_amount] [expected_receiver_account] [expected_receiver_name]");
    console.error("Example: npx tsx test-slip.ts ./slip.jpg 100.50 0812345678 'John Doe'");
    process.exit(1);
  }

  if (!fs.existsSync(imagePath)) {
    console.error(`Error: File not found at path: ${imagePath}`);
    process.exit(1);
  }

  try {
    const data = fs.readFileSync(imagePath);
    console.log(`Analyzing slip: ${imagePath}`);
    console.log(`Expected Amount: ${expectedAmount}`);
    if (expectedReceiverAccount) console.log(`Expected Account: ${expectedReceiverAccount}`);
    if (expectedReceiverName) console.log(`Expected Name: ${expectedReceiverName}`);
    console.log("----------------------------------------");
    
    const result = await analyzeSlipImage(data, expectedAmount, {
      expectedReceiverAccounts: expectedReceiverAccount ? [expectedReceiverAccount] : undefined,
      expectedReceiverName: expectedReceiverName || undefined,
    });

    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Error analyzing slip:", err);
  }
}

main();
