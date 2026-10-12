const staging = process.argv.includes("--profile=staging");
if (staging) {
  console.error("erp staging is not authorized; D08 is unset");
  process.exit(2);
}
console.log(JSON.stringify({ profile: "fixture", followUps: ["D08 connector", "quote approval role"] }));
