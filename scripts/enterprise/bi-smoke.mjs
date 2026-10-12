const staging = process.argv.includes("--profile=staging");
if (staging) {
  console.error("bi staging is not authorized; D07 is unsigned");
  process.exit(2);
}
console.log(JSON.stringify({ profile: "fixture", signed: false }));
