# not-env-sdk-js Requirements

## Summary

not-env-sdk-js is a JavaScript/TypeScript SDK for Node.js that fetches environment variables from not-env and transparently overrides `process.env`. Key features:

- **Synchronous Loading**: Variables fetched synchronously during import (blocks until complete)
- **Transparent Integration**: Existing code using `process.env.FOO` works unchanged
- **Hermetic Behavior**: Only variables from not-env are available (no OS env fallback)
- **Preserved Variables**: `NOT_ENV_URL` and `NOT_ENV_API_KEY` preserved from OS environment
- **Proxy-based**: Uses JavaScript Proxy API to intercept `process.env` access
- **Error Handling**: Exits process on initialization failure (prevents running with invalid config)

## Quick Reference

| Requirement | Specification |
|-------------|---------------|
| **Node.js Version** | 22.0.0 or later |
| **Module System** | ES6 modules and CommonJS |
| **HTTP Client** | Node.js built-in `https`/`http` modules |
| **Initialization** | Synchronous (blocks during import) |
| **Timeout** | 30 seconds for HTTP requests |
| **Error Behavior** | Exits process with code 1 on failure |

## Detailed Requirements

See appendices below for complete functional and non-functional requirements.

---

## Appendix A: Functional Requirements

### FR1: Initialization

**FR1.1:** The SDK must read `NOT_ENV_URL` and `NOT_ENV_API_KEY` from `process.env` on import.

**FR1.2:** If `NOT_ENV_URL` is missing, the SDK must throw an error: `NOT_ENV_URL environment variable is required`.

**FR1.3:** If `NOT_ENV_API_KEY` is missing, the SDK must throw an error: `NOT_ENV_API_KEY environment variable is required`.

**FR1.4:** The SDK must fetch all variables from the backend `/variables` endpoint using HTTPS.

**FR1.5:** The SDK must use the `Authorization: Bearer <API_KEY>` header for authentication.

**FR1.6:** If the fetch fails, the SDK must:
- Print error to stderr
- Exit the process with code 1

**FR1.7:** The SDK must build a map of variables (key → value) from the response.

**FR1.8:** Initialization must happen synchronously during import (before any other code runs).

### FR2: Process.env Patching

**FR2.1:** The SDK must create a Proxy for `process.env` that overrides its behavior.

**FR2.2:** For `NOT_ENV_URL` and `NOT_ENV_API_KEY`:
- Must return values from original OS environment
- Must allow setting these values
- Must preserve them regardless of not-env state

**FR2.3:** For any other key:
- If key exists in not-env → return its value
- If key does not exist in not-env → return `undefined`
- Must not fall back to OS environment variables (hermetic behavior)

**FR2.4:** Setting variables (except `NOT_ENV_URL` and `NOT_ENV_API_KEY`) must be prevented:
- `process.env.KEY = value` must return `false`
- Variables cannot be modified at runtime

**FR2.5:** The `in` operator must work correctly:
- `KEY in process.env` returns `true` only if key exists in not-env
- `NOT_ENV_URL in process.env` returns `true` if set in OS env
- `NOT_ENV_API_KEY in process.env` returns `true` if set in OS env

**FR2.6:** `Object.keys(process.env)` must return:
- All keys from not-env
- `NOT_ENV_URL` if present in OS env
- `NOT_ENV_API_KEY` if present in OS env

**FR2.7:** `Object.getOwnPropertyDescriptor(process.env, KEY)` must return correct descriptor for keys in not-env.

### FR3: Variable Fetching

**FR3.1:** The SDK must make an HTTPS GET request to `{NOT_ENV_URL}/variables`.

**FR3.2:** The request must include:
- `Authorization: Bearer {NOT_ENV_API_KEY}` header
- `Content-Type: application/json` header

**FR3.3:** The SDK must parse the JSON response:
```json
{
  "variables": [
    { "key": "KEY1", "value": "value1" },
    { "key": "KEY2", "value": "value2" }
  ]
}
```

**FR3.4:** The SDK must handle HTTP errors:
- 401 Unauthorized: Invalid API key
- 403 Forbidden: Insufficient permissions
- 404 Not Found: Backend endpoint not found
- 500 Server Error: Backend error
- Network errors: Connection failures

**FR3.5:** All errors must include descriptive messages.

### FR4: Error Handling

**FR4.1:** Missing environment variables must throw clear errors with variable names.

**FR4.2:** Network errors must include error details (hostname, port, etc.).

**FR4.3:** HTTP errors must include status code and error message from backend.

**FR4.4:** Parse errors must indicate JSON parsing failure.

**FR4.5:** All errors must be printed to stderr before process exit.

### FR5: Usage Patterns

**FR5.1:** The SDK must support ES6 import via main entry point:
```javascript
import "not-env-sdk";
```

**FR5.2:** The SDK must support CommonJS require via main entry point:
```javascript
require("not-env-sdk");
```

**FR5.3:** The SDK must support Node.js `--require` flag (optional):
```bash
node --require not-env-sdk index.js
```

**FR5.4:** The SDK must work when imported at the top of entry files.

**FR5.5:** The SDK must work when imported before any code that uses `process.env`.

**FR5.6:** The SDK may support subpath imports (e.g., `not-env-sdk/register`) for backward compatibility, but the main entry point (`not-env-sdk`) is the recommended approach.

## Appendix B: Non-Functional Requirements

### NFR1: Performance

**NFR1.1:** Variable fetching must complete within 30 seconds (timeout).

**NFR1.2:** Process.env access after initialization must be O(1) (map lookup).

**NFR1.3:** Initialization must not block for more than 30 seconds.

### NFR2: Security

**NFR2.1:** The SDK must use HTTPS for all backend communication (or HTTP for localhost).

**NFR2.2:** API keys must never be logged or exposed in error messages.

**NFR2.3:** The SDK must validate URL format before making requests.

### NFR3: Compatibility

**NFR3.1:** The SDK must work with Node.js 22.0.0+.

**NFR3.2:** The SDK must work with TypeScript (provides type definitions).

**NFR3.3:** The SDK must work with:
- Express.js
- Next.js (server-side)
- Any Node.js application using `process.env`

**NFR3.4:** The SDK must not require any build step for end users (pre-compiled).

### NFR4: Reliability

**NFR4.1:** The SDK must handle network timeouts gracefully.

**NFR4.2:** The SDK must handle malformed JSON responses gracefully.

**NFR4.3:** The SDK must not crash the process silently (always exit with error on failure).

### NFR5: Observability

**NFR5.1:** Errors must include sufficient context (URL, status code, error message).

**NFR5.2:** The SDK must not log successful operations (silent on success).

## Appendix C: Implementation Constraints

### IC1: Technology Stack

**IC1.1:** Language: TypeScript (compiled to JavaScript).

**IC1.2:** Runtime: Node.js only (uses Node.js built-in modules).

**IC1.3:** HTTP Client: Node.js built-in `https`/`http` modules (via execSync with inline script for synchronous requests).

**IC1.4:** Build Tool: TypeScript compiler (`tsc`).

### IC2: Module System

**IC2.1:** Must support ES6 modules (import/export).

**IC2.2:** Must support CommonJS (require/module.exports).

**IC2.3:** Main entry point: `dist/register.js`.

**IC2.4:** Type definitions: `dist/register.d.ts`.

### IC3: Process.env Behavior

**IC3.1:** Must use Proxy API for `process.env` patching.

**IC3.2:** Must preserve original `process.env` for `NOT_ENV_URL` and `NOT_ENV_API_KEY`.

**IC3.3:** Must not modify `process.env` directly (only via Proxy).

### IC4: Error Behavior

**IC4.1:** Initialization errors must exit the process (cannot continue with invalid state).

**IC4.2:** Runtime errors (variable access) must return `undefined` (not throw).

## Appendix D: Expected Behaviors

### EB1: Successful Initialization

1. SDK is imported: `import "not-env-sdk"`
2. SDK reads `NOT_ENV_URL` and `NOT_ENV_API_KEY`
3. SDK makes HTTPS GET to `{NOT_ENV_URL}/variables` synchronously
4. SDK receives JSON response with variables
5. SDK builds map of variables
6. SDK creates Proxy for `process.env`
7. Application code can use `process.env.KEY` and get values from not-env

### EB2: Variable Access

1. Code accesses `process.env.DB_HOST`
2. Proxy checks if `DB_HOST` is `NOT_ENV_URL` or `NOT_ENV_API_KEY` → no
3. Proxy checks if `DB_HOST` exists in not-env map → yes
4. Proxy returns value from not-env map
5. Code receives value: `"localhost"`

### EB3: Missing Variable

1. Code accesses `process.env.NONEXISTENT`
2. Proxy checks if key is preserved → no
3. Proxy checks if key exists in not-env map → no
4. Proxy returns `undefined`
5. Code receives `undefined` (hermetic behavior)

### EB4: Preserved Variables

1. Code accesses `process.env.NOT_ENV_URL`
2. Proxy checks if key is preserved → yes
3. Proxy returns value from original OS environment
4. Code receives original value

### EB5: Initialization Failure

1. SDK is imported
2. `NOT_ENV_URL` is missing
3. SDK throws error: `NOT_ENV_URL environment variable is required`
4. Error is printed to stderr
5. Process exits with code 1
6. Application does not start

## Appendix E: Testing Scenarios

### TS1: Basic Usage

- Set `NOT_ENV_URL` and `NOT_ENV_API_KEY`
- Import SDK
- Access `process.env.KEY` that exists in not-env
- Verify value is returned

### TS2: Missing Variable

- Set environment variables
- Import SDK
- Access `process.env.KEY` that doesn't exist in not-env
- Verify `undefined` is returned

### TS3: Preserved Variables

- Set `NOT_ENV_URL` in OS environment
- Import SDK
- Access `process.env.NOT_ENV_URL`
- Verify original value is returned

### TS4: Initialization Failure

- Don't set `NOT_ENV_URL`
- Import SDK
- Verify error is thrown and process exits

### TS5: Network Error

- Set invalid `NOT_ENV_URL`
- Import SDK
- Verify network error is caught and process exits

### TS6: Invalid API Key

- Set valid URL but invalid API key
- Import SDK
- Verify 401 error is caught and process exits
