const staging = process.argv.includes("--profile=staging");
if (staging) {
  console.error("knowledge staging is not authorized; D04 is unprobed");
  process.exit(2);
}
console.log(JSON.stringify({ profile: "fixture", probed: false }));
