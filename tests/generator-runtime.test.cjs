const test = require("node:test");
const assert = require("node:assert/strict");
const net = require("node:net");
const { runGenerator } = require("../scripts/generator-runtime");

test("a duplicate generator exits without writing another sample", async () => {
  const existing = net.createServer();
  await new Promise((resolve) => existing.listen(0, "127.0.0.1", resolve));
  let wrote = false;
  let closed = false;
  const previousExitCode = process.exitCode;
  try {
    await runGenerator({ name: "Test generator", port: existing.address().port,
      save: async () => { wrote = true; }, close: async () => { closed = true; } });
    assert.equal(wrote, false);
    assert.equal(closed, true);
    assert.equal(process.exitCode, 1);
  } finally {
    process.exitCode = previousExitCode;
    await new Promise((resolve) => existing.close(resolve));
  }
});
