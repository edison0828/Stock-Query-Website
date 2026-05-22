import { spawn } from "child_process";

const DEFAULT_TIMEOUT_MS = 20 * 60 * 1000;
const SOURCE_MODES = {
  AUTO: "AUTO",
  FINLAB: "FINLAB",
  FREE: "FREE",
};

const SUMMARY_PREFIX = "[summary] ";

function parseSummary(stdout) {
  if (!stdout) {
    return null;
  }

  const summaryLine = stdout
    .split("\n")
    .reverse()
    .find((line) => line.startsWith(SUMMARY_PREFIX));

  if (!summaryLine) {
    return null;
  }

  try {
    return JSON.parse(summaryLine.slice(SUMMARY_PREFIX.length));
  } catch (error) {
    return {
      parse_error: error.message,
    };
  }
}

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

  hasFinLabToken() {
    return Boolean(process.env.FINLAB_API_TOKEN);
  }

  resolveSource(source = SOURCE_MODES.AUTO) {
    if (source === SOURCE_MODES.FINLAB || source === SOURCE_MODES.FREE) {
      return source;
    }

    return this.hasFinLabToken() ? SOURCE_MODES.FINLAB : SOURCE_MODES.FREE;
  }

  buildArgsForSource({ scope = "TSE_OTC", sections = {}, source }) {
    const scriptName =
      source === SOURCE_MODES.FINLAB ? "db:seed:finlab" : "db:seed:free";
    const args = ["run", scriptName, "--", "--scope", scope];

    if (sections.skipStocks) args.push("--skip-stocks");
    if (sections.skipPrices) args.push("--skip-prices");
    if (sections.skipFinancials) args.push("--skip-financials");
    if (sections.skipDividends) args.push("--skip-dividends");

    return args;
  }

  runCommand(args, resolvedSource) {
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
          source: resolvedSource,
          code,
          stdout,
          stderr,
          summary: parseSummary(stdout),
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

  async run(options = {}) {
    const requestedSource = options.source || SOURCE_MODES.AUTO;

    if (requestedSource !== SOURCE_MODES.AUTO) {
      const args = this.buildArgsForSource({
        ...options,
        source: requestedSource,
      });
      return this.runCommand(args, requestedSource);
    }

    if (!this.hasFinLabToken()) {
      const args = this.buildArgsForSource({
        ...options,
        source: SOURCE_MODES.FREE,
      });
      const result = await this.runCommand(args, SOURCE_MODES.FREE);
      return {
        ...result,
        fallback_reason: "FINLAB_API_TOKEN not configured",
      };
    }

    const finlabArgs = this.buildArgsForSource({
      ...options,
      source: SOURCE_MODES.FINLAB,
    });

    try {
      return await this.runCommand(finlabArgs, SOURCE_MODES.FINLAB);
    } catch (finlabError) {
      const freeArgs = this.buildArgsForSource({
        ...options,
        source: SOURCE_MODES.FREE,
      });
      const freeResult = await this.runCommand(freeArgs, SOURCE_MODES.FREE);
      return {
        ...freeResult,
        fallback_reason: finlabError.message,
        attempts: [finlabError.result].filter(Boolean),
      };
    }
  }
}
