import { spawn } from "child_process";

const DEFAULT_TIMEOUT_MS = 20 * 60 * 1000;

export class MarketDataSyncJob {
  constructor({
    cwd = process.cwd(),
    timeoutMs = DEFAULT_TIMEOUT_MS,
    command = "npm",
  } = {}) {
    this.cwd = cwd;
    this.timeoutMs = timeoutMs;
    this.command = command;
  }

  buildArgs({ scope = "TSE_OTC", sections = {} } = {}) {
    const args = ["run", "db:seed:finlab", "--", "--scope", scope];

    if (sections.skipStocks) args.push("--skip-stocks");
    if (sections.skipPrices) args.push("--skip-prices");
    if (sections.skipFinancials) args.push("--skip-financials");
    if (sections.skipDividends) args.push("--skip-dividends");

    return args;
  }

  run(options = {}) {
    const args = this.buildArgs(options);
    const startedAt = new Date();

    return new Promise((resolve, reject) => {
      const child = spawn(this.command, args, {
        cwd: this.cwd,
        env: process.env,
        shell: false,
      });

      let stdout = "";
      let stderr = "";
      let didTimeout = false;

      const timer = setTimeout(() => {
        didTimeout = true;
        child.kill("SIGTERM");
      }, this.timeoutMs);

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        const finishedAt = new Date();
        const result = {
          command: [this.command, ...args].join(" "),
          code,
          stdout,
          stderr,
          started_at: startedAt.toISOString(),
          finished_at: finishedAt.toISOString(),
          duration_ms: finishedAt.getTime() - startedAt.getTime(),
        };

        if (didTimeout) {
          const error = new Error("市場資料同步逾時");
          error.status = 504;
          error.result = result;
          reject(error);
          return;
        }

        if (code !== 0) {
          const error = new Error("市場資料同步失敗");
          error.status = 500;
          error.result = result;
          reject(error);
          return;
        }

        resolve(result);
      });
    });
  }
}
