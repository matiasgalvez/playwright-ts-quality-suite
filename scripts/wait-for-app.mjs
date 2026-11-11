// Polls the app until it answers, so tests never start against a container that is still booting.
const url = `${process.env.BASE_URL ?? 'http://localhost:3000'}/rest/admin/application-version`;
const timeoutMs = Number(process.env.WAIT_TIMEOUT_MS ?? 120_000);
const started = Date.now();

while (Date.now() - started < timeoutMs) {
  try {
    const res = await fetch(url);
    if (res.ok) {
      const { version } = await res.json();
      console.log(`Juice Shop v${version} is up after ${((Date.now() - started) / 1000).toFixed(1)}s`);
      process.exit(0);
    }
  } catch {
    // not listening yet
  }
  await new Promise((r) => setTimeout(r, 2_000));
}

console.error(`App did not become ready at ${url} within ${timeoutMs / 1000}s`);
process.exit(1);
