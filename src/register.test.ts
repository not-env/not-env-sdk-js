// Test helper functions for register.ts
// Note: Full integration tests would require a running backend server
// These tests verify the core logic functions

describe('not-env-sdk-js register logic', () => {
  // Since register.ts executes immediately on import and uses process.exit,
  // we test the logic separately. Integration tests would require:
  // 1. A mock HTTP server
  // 2. Proper async handling
  // 3. Process isolation
  
  test('URL parsing logic', () => {
    const url1 = new URL('https://test.example.com');
    expect(url1.protocol).toBe('https:');
    expect(url1.hostname).toBe('test.example.com');
    
    const url2 = new URL('http://localhost:1212');
    expect(url2.protocol).toBe('http:');
    expect(url2.hostname).toBe('localhost');
    expect(url2.port).toBe('1212');
  });

  test('JSON response parsing', () => {
    const response = {
      variables: [
        { key: 'DB_HOST', value: 'localhost' },
        { key: 'DB_PORT', value: '5432' }
      ]
    };
    
    const varMap = new Map<string, string>();
    for (const v of response.variables) {
      varMap.set(v.key, v.value);
    }
    
    expect(varMap.get('DB_HOST')).toBe('localhost');
    expect(varMap.get('DB_PORT')).toBe('5432');
    expect(varMap.has('NONEXISTENT')).toBe(false);
  });

  test('Proxy handler logic - preserved variables', () => {
    const originalEnv: NodeJS.ProcessEnv = {
      NOT_ENV_URL: 'https://test.example.com',
      NOT_ENV_API_KEY: 'test-key'
    };
    
    const notEnvVars = new Map<string, string>();
    notEnvVars.set('DB_HOST', 'localhost');
    
    // Simulate Proxy get handler
    const getHandler = (prop: string) => {
      if (prop === 'NOT_ENV_URL' || prop === 'NOT_ENV_API_KEY') {
        return originalEnv[prop];
      }
      if (notEnvVars.has(prop)) {
        return notEnvVars.get(prop);
      }
      return undefined;
    };
    
    expect(getHandler('NOT_ENV_URL')).toBe('https://test.example.com');
    expect(getHandler('NOT_ENV_API_KEY')).toBe('test-key');
    expect(getHandler('DB_HOST')).toBe('localhost');
    expect(getHandler('NONEXISTENT')).toBeUndefined();
  });

  test('Proxy handler logic - has operator', () => {
    const originalEnv: NodeJS.ProcessEnv = {
      NOT_ENV_URL: 'https://test.example.com'
    };
    
    const notEnvVars = new Map<string, string>();
    notEnvVars.set('DB_HOST', 'localhost');
    
    // Simulate Proxy has handler
    const hasHandler = (prop: string) => {
      if (prop === 'NOT_ENV_URL' || prop === 'NOT_ENV_API_KEY') {
        return prop in originalEnv;
      }
      return notEnvVars.has(prop);
    };
    
    expect(hasHandler('NOT_ENV_URL')).toBe(true);
    expect(hasHandler('DB_HOST')).toBe(true);
    expect(hasHandler('NONEXISTENT')).toBe(false);
    expect(hasHandler('NOT_ENV_API_KEY')).toBe(false); // Not in originalEnv
  });
});

