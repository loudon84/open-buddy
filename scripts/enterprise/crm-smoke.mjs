const staging = process.argv.includes("--profile=staging");
if (staging) {
  console.error("crm staging is not authorized; D06 is unset");
  process.exit(2);
}
console.log(JSON.stringify({ profile: "fixture", requiredFields: [] }));
