/**
 * wallet-service.js
 * 減碳錢包服務層:demo 階段以 localStorage 模擬點數餘額與收支紀錄,
 * 點數來源為「智慧減碳排程」採用低碳行程建議時依減碳量核發。
 * 正式上線需改為後端帳號系統,才能讓點數跨裝置同步。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var BALANCE_KEY = "funjia_wallet_points";
  var HISTORY_KEY = "funjia_wallet_history"; // [{id, date, delta, reason}]

  function readBalance() {
    var raw = localStorage.getItem(BALANCE_KEY);
    var value = raw === null ? 0 : parseInt(raw, 10);
    return isNaN(value) ? 0 : value;
  }

  function writeBalance(value) {
    localStorage.setItem(BALANCE_KEY, String(value));
  }

  function readHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function writeHistory(list) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  }

  function pushHistory(delta, reason) {
    var list = readHistory();
    list.unshift({
      id: "wtx-" + list.length + "-" + delta + "-" + reason.length,
      date: new Date().toISOString().slice(0, 10),
      delta: delta,
      reason: reason,
    });
    writeHistory(list);
  }

  function getBalance() {
    return readBalance();
  }

  function getHistory() {
    return readHistory();
  }

  /** 增加點數(例如採用低碳行程建議),回傳異動後餘額 */
  function addPoints(amount, reason) {
    if (!amount || amount <= 0) {
      return readBalance();
    }
    var balance = readBalance() + amount;
    writeBalance(balance);
    pushHistory(amount, reason || "獲得減碳點數");
    return balance;
  }

  /** 扣除點數(例如優惠商城兌換),餘額不足時回傳 false,不做任何異動 */
  function spendPoints(amount, reason) {
    var balance = readBalance();
    if (!amount || amount <= 0 || balance < amount) {
      return false;
    }
    balance -= amount;
    writeBalance(balance);
    pushHistory(-amount, reason || "兌換點數");
    return true;
  }

  ns.walletService = {
    getBalance: getBalance,
    getHistory: getHistory,
    addPoints: addPoints,
    spendPoints: spendPoints,
  };
})(window.FunJia);
