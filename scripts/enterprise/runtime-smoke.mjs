const staging = process.argv.includes("--profile=staging");
if (staging) {
  console.error("staging profile is not authorized in this workspace");
  process.exit(2);
}
console.log(JSON.stringify({ profile: "fixture", ready: false, reason: "D03 and D11 are not measured" }));
