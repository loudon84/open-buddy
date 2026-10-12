const staging = process.argv.includes("--profile=staging");
if (staging) {
  console.error("staging profile is not authorized in this workspace");
  process.exit(2);
}
console.log(JSON.stringify({ profile: "fixture", paths: 9, production: false, reason: "D01 and D02 are unsigned" }));
