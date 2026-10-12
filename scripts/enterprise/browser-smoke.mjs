const staging = process.argv.includes("--profile=staging");
if (staging) {
  console.error("browser staging is not authorized; D05 is unprobed");
  process.exit(2);
}
console.log(JSON.stringify({ profile: "fixture", cdp: false }));
