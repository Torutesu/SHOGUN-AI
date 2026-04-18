/* global window */
(function initActionRegistry(global) {
  function createActionRegistry(api, options) {
    const opts = options || {};
    const onMissing = opts.onMissing || function noop() {};
    const onExecute = opts.onExecute || function noop() {};

    const handlers = {};

    function register(key, action) {
      handlers[key] = action;
    }

    async function run(key, payload) {
      const action = handlers[key];
      if (!action) {
        onMissing(key, payload);
        return {
          ok: false,
          error: { code: "ACTION_NOT_REGISTERED", message: "Action is not registered" },
        };
      }
      onExecute(key, payload);
      return action(payload || {});
    }

    register("app.open_hummingbird", () => api.appOpenHummingbird({ source: "topbar" }));
    register("app.create_share_link", (payload) => api.appCreateShareLink(payload));
    register("settings.save", (payload) => api.settingsSave(payload));
    register("settings.load", (payload) => api.settingsLoad(payload));
    register("integrations.connect", (payload) => api.integrationConnect(payload));
    register("integrations.toggle", (payload) => api.integrationToggle(payload));
    register("capture.pause", () => api.capturePause({ reason: "user_request" }));
    register("capture.resume", () => api.captureResume({ reason: "user_request" }));
    register("permissions.manage", (payload) => api.permissionsManage(payload));
    register("diagnostics.report", (payload) => api.diagnosticsReport(payload));
    register("data.delete_range", (payload) => api.accountDeleteData(payload));
    register("data.delete_all", () => api.accountDeleteAll({}));
    register("account.delete", () => api.accountDeleteSelf({}));
    register("memory.search", (payload) => api.memorySearch(payload));
    register("brief.get", (payload) => api.briefGet(payload));
    register("stats.get", (payload) => api.statsGet(payload));
    register("draft.create", (payload) => api.draftCreate(payload));
    register("schedule.create", (payload) => api.scheduleAction(payload));

    return {
      run: run,
      register: register,
      keys: function keys() { return Object.keys(handlers); },
    };
  }

  global.ShogunActionRegistry = { createActionRegistry: createActionRegistry };
})(window);
