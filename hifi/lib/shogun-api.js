/* global window */
(function initShogunApi(global) {
  const READ = "READ";
  const WRITE = "WRITE";

  function createApi(client) {
    const ipc = client || (global.ShogunIpcClient && global.ShogunIpcClient.createIpcClient
      ? global.ShogunIpcClient.createIpcClient()
      : null);

    if (!ipc) {
      throw new Error("ShogunIpcClient is required");
    }

    async function call(command, payload, kind) {
      const res = await ipc.invoke(command, payload);
      return {
        ok: res.ok,
        kind: kind,
        command: command,
        data: res.data || null,
        error: res.error || null,
      };
    }

    return {
      meta: {
        READ: READ,
        WRITE: WRITE,
      },
      memorySearch: (input) => call("shogun_memory_search", input, READ),
      memoryFetch: (input) => call("shogun_memory_fetch", input, READ),
      entityQuery: (input) => call("shogun_entity_query", input, READ),
      briefGet: (input) => call("shogun_brief_get", input, READ),
      draftCreate: (input) => call("shogun_draft", input, WRITE),
      scheduleAction: (input) => call("shogun_schedule_action", input, WRITE),
      statsGet: (input) => call("shogun_stats", input, READ),
      appOpenHummingbird: (input) => call("app_open_hummingbird", input, WRITE),
      appCreateShareLink: (input) => call("app_create_share_link", input, WRITE),
      settingsLoad: (input) => call("app_settings_load", input, READ),
      settingsSave: (input) => call("app_settings_save", input, WRITE),
      integrationConnect: (input) => call("app_integration_connect", input, WRITE),
      integrationToggle: (input) => call("app_integration_toggle", input, WRITE),
      capturePause: (input) => call("app_capture_pause", input, WRITE),
      captureResume: (input) => call("app_capture_resume", input, WRITE),
      permissionsManage: (input) => call("app_permissions_manage", input, WRITE),
      diagnosticsReport: (input) => call("app_diagnostics_report", input, WRITE),
      accountDeleteData: (input) => call("app_delete_data_range", input, WRITE),
      accountDeleteAll: (input) => call("app_delete_all_data", input, WRITE),
      accountDeleteSelf: (input) => call("app_delete_account", input, WRITE),
    };
  }

  global.ShogunAPI = { createApi: createApi, READ: READ, WRITE: WRITE };
})(window);
