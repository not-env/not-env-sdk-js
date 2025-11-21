import https from 'https';
import http from 'http';

interface Variable {
  key: string;
  value: string;
}

interface VariablesResponse {
  variables: Variable[];
}

// Fetch variables from not-env backend
async function fetchVariables(url: string, apiKey: string): Promise<Map<string, string>> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + '/variables',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    const req = client.request(options, (res) => {
      if (res.statusCode !== 200) {
        let errorBody = '';
        res.on('data', (chunk) => {
          errorBody += chunk.toString();
        });
        res.on('end', () => {
          try {
            const error = JSON.parse(errorBody);
            reject(new Error(`Failed to fetch variables: ${error.error || res.statusCode} - ${error.message || ''}`));
          } catch {
            reject(new Error(`Failed to fetch variables: HTTP ${res.statusCode}`));
          }
        });
        return;
      }

      let body = '';
      res.on('data', (chunk) => {
        body += chunk.toString();
      });

      res.on('end', () => {
        try {
          const data: VariablesResponse = JSON.parse(body);
          const varMap = new Map<string, string>();
          for (const v of data.variables) {
            varMap.set(v.key, v.value);
          }
          resolve(varMap);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error instanceof Error ? error.message : String(error)}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.end();
  });
}

// Store original process.env
const originalEnv = { ...process.env };

// Variables fetched from not-env
let notEnvVars: Map<string, string> | null = null;

// Initialize and patch process.env
async function register() {
  const url = process.env.NOT_ENV_URL;
  const apiKey = process.env.NOT_ENV_API_KEY;

  if (!url) {
    throw new Error('NOT_ENV_URL environment variable is required');
  }

  if (!apiKey) {
    throw new Error('NOT_ENV_API_KEY environment variable is required');
  }

  // Fetch variables from not-env
  notEnvVars = await fetchVariables(url, apiKey);

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
}

// Execute registration immediately when imported
register().catch((error) => {
  console.error('Failed to initialize not-env-sdk:', error);
  process.exit(1);
});

export default register;

