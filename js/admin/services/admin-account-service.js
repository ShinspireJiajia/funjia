/**
 * admin-account-service.js
 * 後台人員帳號/角色權限服務層:demo 階段以 localStorage 保存帳號清單與權限矩陣,
 * 未登入系統,固定以「jia 系統管理員」身分操作(對應 CURRENT_USER)。
 * 正式上線需改為後端帳號系統 + JWT 驗證。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var ACCOUNTS_KEY = "funjia_admin_accounts";
  var PERMISSIONS_KEY = "funjia_admin_role_permissions";

  var CURRENT_USER = { name: "jia", role: "系統管理員" };

  var MODULES = [
    { key: "poi", label: "POI 內容" },
    { key: "events", label: "檔期" },
    { key: "campaign", label: "行銷/點數" },
    { key: "push", label: "推播" },
    { key: "account", label: "帳號管理" },
    { key: "dashboard", label: "數據儀表板" },
  ];

  var SEED_ROLES = ["系統管理員", "內容編輯", "內容審核", "行銷企劃", "客服/營運"];

  // 角色 × 模組 預設權限("full" 全權 | "edit" 新增/編輯 | "review" 審核 | "view" 唯讀 | "none" 無權限)
  var DEFAULT_PERMISSIONS = {
    系統管理員: { poi: "full", events: "full", campaign: "full", push: "full", account: "full", dashboard: "full" },
    內容編輯: { poi: "edit", events: "edit", campaign: "view", push: "view", account: "none", dashboard: "view" },
    內容審核: { poi: "review", events: "review", campaign: "view", push: "none", account: "none", dashboard: "view" },
    行銷企劃: { poi: "view", events: "edit", campaign: "full", push: "edit", account: "none", dashboard: "full" },
    "客服/營運": { poi: "view", events: "view", campaign: "view", push: "view", account: "none", dashboard: "view" },
  };

  var SEED_ACCOUNTS = [
    { id: "acc-001", name: "王小明", email: "ming.wang@funjia.tw", role: "內容編輯", status: "active", lastLoginAt: "2026-07-17T09:12:00" },
    { id: "acc-002", name: "陳美玲", email: "meiling.chen@funjia.tw", role: "內容審核", status: "active", lastLoginAt: "2026-07-16T17:40:00" },
    { id: "acc-003", name: "李政宏", email: "jh.lee@funjia.tw", role: "行銷企劃", status: "active", lastLoginAt: "2026-07-15T11:02:00" },
    { id: "acc-004", name: "張佳琪", email: "chiachi.chang@funjia.tw", role: "客服/營運", status: "disabled", lastLoginAt: "2026-06-02T08:55:00" },
  ];

  function readAccounts() {
    var raw = localStorage.getItem(ACCOUNTS_KEY);
    if (raw === null) {
      writeAccounts(SEED_ACCOUNTS);
      return SEED_ACCOUNTS.slice();
    }
    try {
      return JSON.parse(raw) || [];
    } catch (e) {
      return [];
    }
  }

  function writeAccounts(list) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
  }

  function readPermissions() {
    var raw = localStorage.getItem(PERMISSIONS_KEY);
    if (raw === null) {
      writePermissions(DEFAULT_PERMISSIONS);
      return JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS));
    }
    try {
      return JSON.parse(raw) || {};
    } catch (e) {
      return {};
    }
  }

  function writePermissions(map) {
    localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(map));
  }

  function getCurrentUser() {
    return CURRENT_USER;
  }

  function getAccounts() {
    return readAccounts();
  }

  function addAccount(data) {
    var list = readAccounts();
    var item = Object.assign(
      { id: "acc-" + Date.now(), status: "active", lastLoginAt: null },
      data
    );
    list.unshift(item);
    writeAccounts(list);
    return item;
  }

  function setAccountStatus(id, status) {
    var list = readAccounts();
    var index = list.findIndex(function (a) {
      return a.id === id;
    });
    if (index === -1) return null;
    list[index].status = status;
    writeAccounts(list);
    return list[index];
  }

  function getRoles() {
    return SEED_ROLES.slice();
  }

  function getModules() {
    return MODULES.slice();
  }

  function getPermissionMatrix() {
    return readPermissions();
  }

  /** 切換指定角色在指定模組的權限等級(依 LEVELS 循環) */
  function cyclePermission(role, moduleKey) {
    var LEVELS = ["none", "view", "edit", "review", "full"];
    var matrix = readPermissions();
    matrix[role] = matrix[role] || {};
    var current = matrix[role][moduleKey] || "none";
    var next = LEVELS[(LEVELS.indexOf(current) + 1) % LEVELS.length];
    matrix[role][moduleKey] = next;
    writePermissions(matrix);
    return next;
  }

  ns.adminAccountService = {
    getCurrentUser: getCurrentUser,
    getAccounts: getAccounts,
    addAccount: addAccount,
    setAccountStatus: setAccountStatus,
    getRoles: getRoles,
    getModules: getModules,
    getPermissionMatrix: getPermissionMatrix,
    cyclePermission: cyclePermission,
  };
})(window.FunJia);
