/* global window */
(function initIpcClient(global) {
  const DEFAULT_TIMEOUT_MS = 8000;

  function createError(code, message, details) {
    const err = new Error(message);
    err.code = code;
    err.details = details || null;
    return err;
  }

  function hasTauriInvoke() {
    return Boolean(global.__TAURI__ && global.__TAURI__.core && typeof global.__TAURI__.core.invoke === "function");
  }

  async function tauriTransport(command, payload) {
    if (!hasTauriInvoke()) {
      throw createError("TRANSPORT_UNAVAILABLE", "Tauri invoke is unavailable");
    }
    return global.__TAURI__.core.invoke(command, payload || {});
  }

  async function mockTransport(command, payload) {
    return {
      ok: true,
      command: command,
      payload: payload || {},
      mock: true,
      ts: new Date().toISOString(),
    };
  }

  function withTimeout(promise, timeoutMs) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(createError("TIMEOUT", "IPC request timed out"));
      }, timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  function createIpcClient(options) {
    const opts = options || {};
    const timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;
    const transport = opts.transport || (hasTauriInvoke() ? "tauri" : "mock");

    async function invoke(command, payload) {
      if (!command) {
        throw createError("INVALID_COMMAND", "command is required");
      }

      const request = {
        command: command,
        payload: payload || {},
      };

      try {
        const raw = transport === "tauri"
          ? await withTimeout(tauriTransport(command, payload), timeoutMs)
          : await withTimeout(mockTransport(command, payload), timeoutMs);
        return { ok: true, data: raw, request: request };
      } catch (error) {
        return {
          ok: false,
          error: {
            code: error.code || "IPC_ERROR",
            message: error.message || "Unknown IPC error",
            details: error.details || null,
          },
          request: request,
        };
      }
    }

    return {
      invoke: invoke,
      transport: transport,
      hasTauriInvoke: hasTauriInvoke,
    };
  }

  global.ShogunIpcClient = { createIpcClient: createIpcClient };
})(window);
