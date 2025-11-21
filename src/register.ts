import { execSync } from 'child_process';

/**
 * Variable represents a single environment variable from not-env
 */
interface Variable {
  key: string;
  value: string;
}

/**
 * VariablesResponse represents the API response from not-env backend
 */
interface VariablesResponse {
  variables: Variable[];
}

/**
 * Fetch variables from not-env backend synchronously using Node.js built-ins.
 * 
 * Uses execSync with inline Node.js script to make synchronous HTTP request.
 * This ensures variables are loaded before process.env is patched.
 * Alternative async approaches would require code changes in user applications.
 * 
 * @param url - The not-env backend URL
 * @param apiKey - The API key for authentication
 * @returns A Map of environment variable keys to values
 * @throws Error if the request fails or returns non-200 status
 */
function fetchVariables(url: string, apiKey: string): Map<string, string> {
  const urlObj = new URL(url);
  const variablesUrl = `${urlObj.origin}${urlObj.pathname}/variables`;

  // Use Node.js itself to make a synchronous HTTP request via execSync
  // Create an inline Node.js script that uses built-in http/https modules
  const escapedUrl = JSON.stringify(variablesUrl);
  const escapedApiKey = JSON.stringify(apiKey);

  const nodeScript = `
    const http = require('http');
    const https = require('https');
    const { URL } = require('url');
    const u = ${escapedUrl};
    const k = ${escapedApiKey};
    const urlObj = new URL(u);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + k,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    };
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk.toString(); });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          try {
            const error = JSON.parse(body);
            process.stderr.write('ERROR:' + res.statusCode + ':' + (error.message || ''));
          } catch {
            process.stderr.write('ERROR:' + res.statusCode + ':' + body);
          }
          process.exit(1);
        } else {
          process.stdout.write(body);
        }
      });
    });
    req.on('error', (error) => {
      process.stderr.write('ERROR:' + error.message);
      process.exit(1);
    });
    req.setTimeout(30000, () => {
      req.destroy();
      process.stderr.write('ERROR:Request timeout');
      process.exit(1);
    });
    req.end();
  `;

  try {
    const output = execSync(`node -e ${JSON.stringify(nodeScript)}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 35000, // Slightly longer than request timeout
    });

    const data: VariablesResponse = JSON.parse(output.trim());
    const varMap = new Map<string, string>();
    for (const v of data.variables) {
      varMap.set(v.key, v.value);
    }
    return varMap;
  } catch (error: any) {
    // Parse error output
    if (error.stderr) {
      const errorMatch = error.stderr.toString().match(/^ERROR:(\d+):(.+)$/);
      if (errorMatch) {
        const statusCode = parseInt(errorMatch[1], 10);
        const errorMessage = errorMatch[2];
        throw new Error(`Failed to fetch variables: ${statusCode} - ${errorMessage}`);
      }
      const errorMsg = error.stderr.toString().replace(/^ERROR:/, '');
      throw new Error(`Failed to fetch variables: ${errorMsg}`);
    }
    throw new Error(`Failed to fetch variables: ${error.message || String(error)}`);
  }
}

// Store original process.env
const originalEnv = { ...process.env };

// Variables fetched from not-env
let notEnvVars: Map<string, string> | null = null;

/**
 * Initialize and patch process.env with variables from not-env.
 * 
 * This function:
 * 1. Reads NOT_ENV_URL and NOT_ENV_API_KEY from environment
 * 2. Fetches variables from not-env backend synchronously
 * 3. Patches process.env with a Proxy to override variable access
 * 4. Ensures hermetic behavior (only variables from not-env are available)
 * 
 * This function is called immediately when the module is imported.
 * 
 * @throws Error if NOT_ENV_URL or NOT_ENV_API_KEY are missing
 * @throws Error if fetching variables fails
 */
function register() {
  const url = process.env.NOT_ENV_URL;
  const apiKey = process.env.NOT_ENV_API_KEY;

  if (!url) {
    console.error('Failed to initialize not-env-sdk: NOT_ENV_URL environment variable is required');
    console.error('Set NOT_ENV_URL and NOT_ENV_API_KEY environment variables.');
    console.error('Get your API key from "not-env env import" or "not-env env create" output.');
    process.exit(1);
  }

  if (!apiKey) {
    console.error('Failed to initialize not-env-sdk: NOT_ENV_API_KEY environment variable is required');
    console.error('Set NOT_ENV_URL and NOT_ENV_API_KEY environment variables.');
    console.error('Get your API key from "not-env env import" or "not-env env create" output.');
    process.exit(1);
  }

  try {
    // Fetch variables from not-env synchronously (blocks until complete)
    notEnvVars = fetchVariables(url, apiKey);

    // Create a proxy for process.env
    const handler = {
    get(target: NodeJS.ProcessEnv, prop: string) {
      // Preserve NOT_ENV_URL and NOT_ENV_API_KEY from original OS env
      if (prop === 'NOT_ENV_URL' || prop === 'NOT_ENV_API_KEY') {
        return originalEnv[prop];
      }

      // Return value from not-env if it exists
      if (notEnvVars && notEnvVars.has(prop)) {
        return notEnvVars.get(prop);
      }

      // Return undefined for keys not in not-env (hermetic behavior)
      return undefined;
    },

    set(target: NodeJS.ProcessEnv, prop: string, value: string) {
      // Allow setting NOT_ENV_URL and NOT_ENV_API_KEY
      if (prop === 'NOT_ENV_URL' || prop === 'NOT_ENV_API_KEY') {
        originalEnv[prop] = value;
        return true;
      }

      // Prevent setting other variables (hermetic behavior)
      return false;
    },

    has(target: NodeJS.ProcessEnv, prop: string) {
      // NOT_ENV_URL and NOT_ENV_API_KEY always exist if set in OS env
      if (prop === 'NOT_ENV_URL' || prop === 'NOT_ENV_API_KEY') {
        return prop in originalEnv;
      }

      // Check if key exists in not-env
      return notEnvVars ? notEnvVars.has(prop) : false;
    },

    ownKeys(target: NodeJS.ProcessEnv) {
      // Return keys from not-env plus NOT_ENV_URL and NOT_ENV_API_KEY if present
      const keys: string[] = [];
      if (notEnvVars) {
        keys.push(...notEnvVars.keys());
      }
      if ('NOT_ENV_URL' in originalEnv) {
        keys.push('NOT_ENV_URL');
      }
      if ('NOT_ENV_API_KEY' in originalEnv) {
        keys.push('NOT_ENV_API_KEY');
      }
      return keys;
    },

    getOwnPropertyDescriptor(target: NodeJS.ProcessEnv, prop: string) {
      if (handler.has(target, prop)) {
        return {
          enumerable: true,
          configurable: true,
          value: handler.get(target, prop),
        };
      }
      return undefined;
    },
    };

    process.env = new Proxy(process.env, handler) as NodeJS.ProcessEnv;
  } catch (error) {
    console.error('Failed to initialize not-env-sdk:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Execute registration immediately when imported (synchronously - blocks until variables are loaded)
register();

export default register;

