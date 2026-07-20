/**
 * admin-point-rule-service.js
 * 後台減碳點數「派點規則」設定服務層:demo 階段以 localStorage 保存規則清單,
 * 供後台頁面展示與編輯派點條件。目前僅作為對外呈現一致數字的設定參考,
 * 智慧減碳排程(itinerary-planner-service.js)仍採固定係數計算,
 * 正式上線需將排程演算法改為讀取本表以動態套用規則。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var RULES_KEY = "funjia_admin_point_rules";

  var SEED_RULES = [
    { id: "rule-001", event: "採用低碳行程建議", points: "+10 ~ 30", dailyCap: "3 次", cooldown: "—", status: "active" },
    { id: "rule-002", event: "觸口轉運站轉乘公車上阿里山", points: "+50", dailyCap: "1 次", cooldown: "24 小時", status: "active" },
    { id: "rule-003", event: "大眾運輸／YouBike 打卡", points: "+5", dailyCap: "4 次", cooldown: "30 分鐘", status: "active" },
    { id: "rule-004", event: "完成旅遊回饋問卷", points: "+20", dailyCap: "—", cooldown: "單次活動限領", status: "draft" },
  ];

  function readRules() {
    var raw = localStorage.getItem(RULES_KEY);
    if (raw === null) {
      writeRules(SEED_RULES);
      return SEED_RULES.slice();
    }
    try {
      return JSON.parse(raw) || [];
    } catch (e) {
      return [];
    }
  }

  function writeRules(list) {
    localStorage.setItem(RULES_KEY, JSON.stringify(list));
  }

  function getRules() {
    return readRules();
  }

  function addRule(data) {
    var list = readRules();
    var item = Object.assign({ id: "rule-" + Date.now(), status: "draft" }, data);
    list.push(item);
    writeRules(list);
    return item;
  }

  function setRuleStatus(id, status) {
    var list = readRules();
    var index = list.findIndex(function (r) {
      return r.id === id;
    });
    if (index === -1) return null;
    list[index].status = status;
    writeRules(list);
    return list[index];
  }

  ns.adminPointRuleService = {
    getRules: getRules,
    addRule: addRule,
    setRuleStatus: setRuleStatus,
  };
})(window.FunJia);
