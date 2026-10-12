const staging = process.argv.includes("--profile=staging");
if (staging) {
  console.error("staging profile is not authorized in this workspace");
  process.exit(2);
}
console.log(JSON.stringify({ profile: "fixture", container: false, reason: "D09 is unsigned and no container daemon ran" }));
