/**
 * admin-audit-service.js
 * 後台操作紀錄服務層:各後台頁面在完成新增/編輯/上下架/派點等動作後,
 * 呼叫 log() 寫入一筆紀錄,供「操作紀錄」頁面查詢與追查,demo 階段以 localStorage 保存。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var LOG_KEY = "funjia_admin_audit_log";
  var MAX_ENTRIES = 300;

  // 示範用歷史紀錄(第一次載入時作為種子資料,之後皆以實際操作為主)
  var SEED_LOG = [
    { id: "seed-3", operator: "李政宏", module: "行銷/點數", action: "手動派點", detail: "+50(活動獎勵,需二次核准)", at: "2026-07-16T16:10:00" },
    { id: "seed-2", operator: "陳美玲", module: "POI", action: "審核通過", detail: "使用者投稿「獨立山步道」", at: "2026-07-17T08:55:00" },
    { id: "seed-1", operator: "王小明", module: "POI", action: "上架", detail: "「阿里山國家森林遊樂區」", at: "2026-07-17T09:20:00" },
  ];

  function readLog() {
    var raw = localStorage.getItem(LOG_KEY);
    if (raw === null) {
      writeLog(SEED_LOG);
      return SEED_LOG.slice();
    }
    try {
      return JSON.parse(raw) || [];
    } catch (e) {
      return [];
    }
  }

  function writeLog(list) {
    localStorage.setItem(LOG_KEY, JSON.stringify(list));
  }

  /** 取得目前登入的後台操作人(demo 固定身分,正式上線需改為登入系統的真實帳號) */
  function getCurrentOperator() {
    return (ns.adminAccountService && ns.adminAccountService.getCurrentUser().name) || "系統管理員";
  }

  /**
   * 寫入一筆操作紀錄
   * @param {string} module 模組名稱,例如 "POI"、"行程範本"、"行銷/點數"、"推播"、"帳號"
   * @param {string} action 動作名稱,例如 "上架"、"審核通過"、"手動派點"
   * @param {string} detail 內容說明
   */
  function log(module, action, detail) {
    var list = readLog();
    list.unshift({
      id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      operator: getCurrentOperator(),
      module: module,
      action: action,
      detail: detail || "",
      at: new Date().toISOString(),
    });
    if (list.length > MAX_ENTRIES) {
      list = list.slice(0, MAX_ENTRIES);
    }
    writeLog(list);
  }

  /** 依模組/操作人關鍵字篩選操作紀錄 */
  function getLog(filter) {
    var list = readLog();
    if (!filter) return list;
    return list.filter(function (entry) {
      var moduleOk = !filter.module || entry.module === filter.module;
      var operatorOk = !filter.operator || entry.operator.indexOf(filter.operator) !== -1;
      return moduleOk && operatorOk;
    });
  }

  ns.adminAuditService = {
    log: log,
    getLog: getLog,
  };
})(window.FunJia);
