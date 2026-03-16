const { Sandbox } = require('@e2b/code-interpreter');
const config = require('./doom-agent/config.js');

async function main() {
  console.log("Creating sandbox...", config.e2bApiKey ? "Key exists" : "No key");
  const sandbox = await Sandbox.create({ apiKey: config.e2bApiKey });

  const code1 = `
import matplotlib.pyplot as plt
labels = ['A', 'B']
sizes = [30, 20]
plt.pie(sizes, labels=labels)
plt.show()
  `.trim();

  const execution1 = await sandbox.runCode(code1);
  console.log("Exec1 complete:", execution1.results?.length);
  if (execution1.results?.[0]) {
      console.log("Exec1 format:", Object.keys(execution1.results[0]));
      console.log("Exec1 has PNG?", !!execution1.results[0].png);
  }

  const code2 = `
import matplotlib.pyplot as plt
import io, base64
labels = ['A', 'B']
sizes = [30, 20]
plt.pie(sizes, labels=labels)
buf = io.BytesIO()
plt.savefig(buf, format='png')
buf.seek(0)
  `.trim();

  const execution2 = await sandbox.runCode(code2);
  console.log("Exec2 complete:", execution2.results?.length);
  if (execution2.results?.[0]) {
      console.log("Exec2 format:", Object.keys(execution2.results[0]));
      console.log("Exec2 has PNG?", !!execution2.results[0].png);
  }

  await sandbox.disconnect();
}

main().catch(console.error);
