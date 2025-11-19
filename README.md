# not-env-sdk-js

not-env-sdk-js is a JavaScript/TypeScript SDK for Node.js that fetches environment variables from not-env and transparently overrides `process.env` so existing code using `process.env.FOO` works unchanged.

## Overview

The SDK:
- Fetches all variables from not-env at startup
- Monkey-patches `process.env` to return not-env values
- Preserves `NOT_ENV_URL` and `NOT_ENV_API_KEY` from OS environment
- Makes other keys undefined if not in not-env (hermetic behavior)
- Works transparently with existing code

## Installation

```bash
npm install not-env-sdk-js
```

Or with yarn:

```bash
yarn add not-env-sdk-js
```

## Prerequisites

- Node.js 18.0.0 or later
- A running not-env backend
- An ENV_READ_ONLY or ENV_ADMIN API key

## Quick Start

### 1. Set Environment Variables

Set the backend URL and API key as OS environment variables:

```bash
export NOT_ENV_URL="https://not-env.example.com"
export NOT_ENV_API_KEY="your-env-read-only-key-here"
```

### 2. Import the SDK

Import the SDK at the very beginning of your application (before any other code that uses `process.env`):

```javascript
// index.js
import "not-env-sdk-js/register";

// Now process.env is patched
console.log(process.env.DB_HOST);      // comes from not-env
console.log(process.env.DB_PASSWORD);  // comes from not-env
```

Or using require:

```javascript
// index.js
require("not-env-sdk-js/register");

console.log(process.env.DB_HOST);
```

### 3. Run Your Application

```bash
node index.js
```

**Expected output:**
```
localhost
secret123
```

**If this works correctly, you should see:**
- Variable values from not-env printed
- Your application can now use `process.env.*` as usual

## Usage Examples

### Basic Usage

```javascript
// app.js
import "not-env-sdk-js/register";

const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT;

console.log(`Connecting to ${dbHost}:${dbPort}`);
```

### With Node.js --require Flag

You can also use the `--require` flag to load the SDK without modifying your code:

```bash
NOT_ENV_URL="https://not-env.example.com" \
NOT_ENV_API_KEY="your-key" \
node --require not-env-sdk-js/register index.js
```

### With Next.js (Server-Side)

For Next.js server-side code, import in your API routes or server components:

```javascript
// pages/api/example.js or app/api/example/route.js
import "not-env-sdk-js/register";

export default function handler(req, res) {
  const apiKey = process.env.EXTERNAL_API_KEY;
  // Use apiKey...
}
```

**Note:** This SDK is primarily for server-side Node.js. For client-side code, use environment variables at build time or use a different approach.

## How It Works

1. **On Import**: The SDK immediately:
   - Reads `NOT_ENV_URL` and `NOT_ENV_API_KEY` from `process.env`
   - Fetches all variables from the `/variables` endpoint
   - Creates a Proxy for `process.env`

2. **Process.env Behavior**:
   - `NOT_ENV_URL` and `NOT_ENV_API_KEY`: Returned from original OS environment
   - Other keys: Returned from not-env if they exist, otherwise `undefined`
   - Setting variables: Prevented (hermetic behavior)

3. **Transparent Integration**: Existing code using `process.env.FOO` works without changes.

## Environment Variables

### Required

- `NOT_ENV_URL`: Backend URL (e.g., `https://not-env.example.com`)
- `NOT_ENV_API_KEY`: ENV_READ_ONLY or ENV_ADMIN API key

### Example

```bash
export NOT_ENV_URL="https://not-env.example.com"
export NOT_ENV_API_KEY="dGVzdF9lbnZfcmVhZG9ubHlfa2V5X2hlcmU..."
```

## Example Application

Create a simple example:

```javascript
// example.js
import "not-env-sdk-js/register";

console.log("Database Configuration:");
console.log(`  Host: ${process.env.DB_HOST}`);
console.log(`  Port: ${process.env.DB_PORT}`);
console.log(`  Name: ${process.env.DB_NAME}`);

// Use variables as normal
const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
console.log(`Connection: ${connectionString}`);
```

Run it:

```bash
NOT_ENV_URL="https://not-env.example.com" \
NOT_ENV_API_KEY="your-key" \
node example.js
```

**Expected output:**
```
Database Configuration:
  Host: localhost
  Port: 5432
  Name: myapp
Connection: postgresql://user:pass@localhost:5432/myapp
```

**If this works correctly, you should see:**
- All variables printed from not-env
- Connection string built using those variables
- No errors or undefined values (assuming variables exist in not-env)

## Error Handling

### Missing Environment Variables

If `NOT_ENV_URL` or `NOT_ENV_API_KEY` are missing:

```
Error: NOT_ENV_URL environment variable is required
```

**Solution:** Set both environment variables before running your application.

### Backend Unreachable

If the backend is unreachable:

```
Error: Request failed: getaddrinfo ENOTFOUND not-env.example.com
```

**Solution:** Check the `NOT_ENV_URL` and ensure the backend is running and accessible.

### Invalid API Key

If the API key is invalid:

```
Error: Failed to fetch variables: 401 - Unauthorized
```

**Solution:** Verify your `NOT_ENV_API_KEY` is correct and not revoked.

### Initialization Failure

If initialization fails, the SDK will:
- Print an error to stderr
- Exit the process with code 1

This ensures your application doesn't run with incorrect configuration.

## Behavior Details

### Hermetic Behavior

The SDK provides hermetic behavior:
- Variables not in not-env return `undefined`
- No fallback to OS environment variables (except `NOT_ENV_URL` and `NOT_ENV_API_KEY`)
- Prevents setting variables at runtime

### Preserved Variables

These variables are always preserved from OS environment:
- `NOT_ENV_URL`
- `NOT_ENV_API_KEY`

### Variable Access

- `process.env.KEY`: Returns value from not-env if exists, otherwise `undefined`
- `process.env.KEY = value`: Prevented (returns false)
- `KEY in process.env`: Returns true only if key exists in not-env
- `Object.keys(process.env)`: Returns only keys from not-env (plus preserved vars)

## Compatibility

### Supported Runtimes

- Node.js 18.0.0+
- Server-side Next.js
- Express.js
- Any Node.js application

### Not Supported

- Browser/client-side JavaScript (requires Node.js)
- Deno (not tested)
- Bun (may work but not tested)

## Integration with CLI

The SDK works alongside the CLI:

1. **CLI**: Use `not-env env set` to load variables into your shell
2. **SDK**: Use `import "not-env-sdk-js/register"` to load variables in Node.js

Both can be used together - CLI for shell scripts, SDK for Node.js applications.

## Troubleshooting

### Variables are undefined

- Check that variables exist in not-env: `not-env var list`
- Verify you're using the correct API key (ENV_READ_ONLY or ENV_ADMIN)
- Ensure the SDK is imported before any code that uses `process.env`

### SDK not loading

- Ensure the SDK is imported at the very top of your entry file
- Check that `NOT_ENV_URL` and `NOT_ENV_API_KEY` are set
- Verify the backend is accessible

### Performance concerns

- Variables are fetched once at startup
- No caching beyond the initial fetch
- Network request happens synchronously during import

## Security Notes

- **API Keys**: Store `NOT_ENV_API_KEY` securely. Never commit it to version control.
- **HTTPS**: Always use HTTPS for `NOT_ENV_URL` in production.
- **Read-Only Keys**: Use ENV_READ_ONLY keys when possible for better security.

## Next Steps

- Set up your [backend](../not-env-backend/README.md)
- Use the [CLI](../not-env-cli/README.md) to manage variables
- Integrate the SDK into your Node.js applications

