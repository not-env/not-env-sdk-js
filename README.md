# not-env-sdk

JavaScript/TypeScript SDK for Node.js that fetches environment variables from not-env and transparently overrides `process.env`.

## 30-Second Example

```bash
export NOT_ENV_URL="http://localhost:1212"
export NOT_ENV_API_KEY="your-env-read-only-key"
```
```javascript
require('not-env-sdk');
console.log(process.env.DB_HOST);  // That's it!
```

## Quick Reference

| Task | Command/Code |
|------|--------------|
| **Install** | `npm install not-env-sdk` |
| **Set environment variables** | `export NOT_ENV_URL="..."`<br>`export NOT_ENV_API_KEY="..."` |
| **Import SDK** | `import "not-env-sdk";` or `require("not-env-sdk");` |
| **Use variables** | `process.env.DB_HOST` (works transparently) |
| **Run with --require** | `node --require not-env-sdk index.js` |

## Overview

The SDK:
- Fetches all variables from not-env at startup (synchronously)
- Monkey-patches `process.env` to return not-env values
- Preserves `NOT_ENV_URL` and `NOT_ENV_API_KEY` from OS environment
- Makes other keys undefined if not in not-env (hermetic behavior)
- Works transparently with existing code

## Prerequisites

- Node.js 22.0.0 or later
- A running not-env backend
- An ENV_READ_ONLY or ENV_ADMIN API key

## Installation

```bash
npm install not-env-sdk
```

## Quick Start

### 1. Set Environment Variables

```bash
export NOT_ENV_URL="https://not-env.example.com"
export NOT_ENV_API_KEY="your-env-read-only-key-here"
```

### 2. Import the SDK

Import at the very beginning of your application (before any code that uses `process.env`):

```javascript
// index.js
import "not-env-sdk";

// Now process.env is patched
console.log(process.env.DB_HOST);      // comes from not-env
console.log(process.env.DB_PASSWORD);  // comes from not-env
```

Or using require:

```javascript
require("not-env-sdk");
console.log(process.env.DB_HOST);
```

### 3. Run Your Application

```bash
node index.js
```

## Usage Examples

### Basic Usage

```javascript
import "not-env-sdk";

const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT;
console.log(`Connecting to ${dbHost}:${dbPort}`);
```

### With Node.js --require Flag (Optional)

```bash
NOT_ENV_URL="https://not-env.example.com" \
NOT_ENV_API_KEY="your-key" \
node --require not-env-sdk index.js
```

**Note:** The `--require` flag is optional. You can simply import the SDK normally in your code.

### With Next.js (Server-Side)

```javascript
// pages/api/example.js or app/api/example/route.js
import "not-env-sdk";

export default function handler(req, res) {
  const apiKey = process.env.EXTERNAL_API_KEY;
  // Use apiKey...
}
```

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NOT_ENV_URL` | Yes | Backend URL | `https://not-env.example.com` |
| `NOT_ENV_API_KEY` | Yes | ENV_READ_ONLY or ENV_ADMIN API key | `dGVzdF9lbnZfcmVhZG9ubHlfa2V5X2hlcmU...` |

## How It Works

1. **On Import**: The SDK immediately:
   - Reads `NOT_ENV_URL` and `NOT_ENV_API_KEY` from `process.env`
   - Fetches all variables from the `/variables` endpoint synchronously
   - Creates a Proxy for `process.env`

2. **Process.env Behavior**:
   - `NOT_ENV_URL` and `NOT_ENV_API_KEY`: Returned from original OS environment
   - Other keys: Returned from not-env if they exist, otherwise `undefined`
   - Setting variables: Prevented (hermetic behavior)

3. **Transparent Integration**: Existing code using `process.env.FOO` works without changes.

## Error Handling

**Missing environment variables:**
- Error: `NOT_ENV_URL environment variable is required`
- Solution: Set both `NOT_ENV_URL` and `NOT_ENV_API_KEY`

**Backend unreachable:**
- Error: `Request failed: getaddrinfo ENOTFOUND...`
- Solution: Check `NOT_ENV_URL` and ensure backend is running

**Invalid API key:**
- Error: `Failed to fetch variables: 401 - Unauthorized`
- Solution: Verify `NOT_ENV_API_KEY` is correct

**Initialization failure:**
- SDK prints error to stderr and exits with code 1
- Ensures application doesn't run with incorrect configuration

## Behavior Details

### Hermetic Behavior

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

**Supported:**
- Node.js 22.0.0+
- Server-side Next.js
- Express.js
- Any Node.js application

**Not Supported:**
- Browser/client-side JavaScript (requires Node.js)
- Deno (not tested)
- Bun (may work but not tested)

## Troubleshooting

**Where do I get ENV_READ_ONLY key?**
- From `not-env env import` or `not-env env create` output. Look for the "ENV_READ_ONLY key:" line.
- This is the key you set as `NOT_ENV_API_KEY` environment variable.

**Variables are undefined:**
- Check that variables exist in not-env: `not-env var list`
- Verify you're using the correct API key (ENV_READ_ONLY or ENV_ADMIN)
- Ensure the SDK is imported before any code that uses `process.env`

**SDK not loading:**
- Ensure the SDK is imported at the very top of your entry file
- Check that `NOT_ENV_URL` and `NOT_ENV_API_KEY` are set
- Verify the backend is accessible

**Performance concerns:**
- Variables are fetched once at startup (synchronously)
- No caching beyond the initial fetch
- Network request happens synchronously during import

## Security Notes

- **API Keys**: Store `NOT_ENV_API_KEY` securely. Never commit it to version control.
- **HTTPS**: Always use HTTPS for `NOT_ENV_URL` in production.
- **Read-Only Keys**: Use ENV_READ_ONLY keys when possible for better security.

## Next Steps

- Set up your [backend](../../not-env-backend/README.md)
- Use the [CLI](../../not-env-cli/README.md) to manage variables
- Integrate the SDK into your Node.js applications
