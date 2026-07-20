/**
 * reward-service.js
 * 優惠商城服務層:提供可用減碳點數兌換的店家折價券與贈品/服務清單,
 * 兌換會透過 walletService 扣點,成功後產生兌換碼並存於 localStorage(demo 模擬)。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var REDEMPTIONS_KEY = "funjia_reward_redemptions"; // [{id, rewardId, code, date}]
  var CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  // 後台專用:上架狀態/庫存覆蓋(key 為 rewardId),與後台新增的自訂獎勵
  var ADMIN_OVERRIDES_KEY = "funjia_admin_reward_overrides"; // { [id]: {status?, stock?, cost?, ...} }
  var ADMIN_CUSTOM_KEY = "funjia_admin_reward_custom"; // [{...後台新增的獎勵,含 id/status}]

  function readOverrides() {
    try {
      return JSON.parse(localStorage.getItem(ADMIN_OVERRIDES_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function writeOverrides(map) {
    localStorage.setItem(ADMIN_OVERRIDES_KEY, JSON.stringify(map));
  }

  function readCustomRewards() {
    try {
      return JSON.parse(localStorage.getItem(ADMIN_CUSTOM_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function writeCustomRewards(list) {
    localStorage.setItem(ADMIN_CUSTOM_KEY, JSON.stringify(list));
  }

  function generateCode() {
    var code = "";
    for (var i = 0; i < 6; i++) {
      code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
    }
    return code;
  }

  function readRedemptions() {
    try {
      return JSON.parse(localStorage.getItem(REDEMPTIONS_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function writeRedemptions(list) {
    localStorage.setItem(REDEMPTIONS_KEY, JSON.stringify(list));
  }

  function getRewards(kind) {
    return ns.dataService.fetchJson("rewards.json").then(function (list) {
      var overrides = readOverrides();
      var merged = list
        .map(function (r) {
          return overrides[r.id] ? Object.assign({}, r, overrides[r.id]) : r;
        })
        .concat(readCustomRewards())
        .filter(function (r) {
          return (r.status || "published") === "published";
        });
      return kind ? merged.filter(function (r) { return r.kind === kind; }) : merged;
    });
  }

  /** 後台專用:取得「全部」獎勵(含下架/庫存偏低),附上 status/stock 欄位 */
  function getAllRewardsForAdmin() {
    return ns.dataService.fetchJson("rewards.json").then(function (list) {
      var overrides = readOverrides();
      var seed = list.map(function (r) {
        var merged = overrides[r.id] ? Object.assign({}, r, overrides[r.id]) : Object.assign({}, r);
        merged.status = merged.status || "published";
        merged.isCustom = false;
        return merged;
      });
      return seed.concat(readCustomRewards());
    });
  }

  /** 後台專用:更新獎勵(狀態/庫存/所需點數等),官方獎勵存覆蓋表,自訂獎勵直接更新 */
  function updateReward(id, patch) {
    var custom = readCustomRewards();
    var index = custom.findIndex(function (r) {
      return r.id === id;
    });
    if (index !== -1) {
      custom[index] = Object.assign({}, custom[index], patch);
      writeCustomRewards(custom);
      return;
    }
    var overrides = readOverrides();
    overrides[id] = Object.assign({}, overrides[id], patch);
    writeOverrides(overrides);
  }

  /** 後台專用:新增自訂獎勵 */
  function addCustomReward(data) {
    var custom = readCustomRewards();
    var item = Object.assign(
      {
        id: "custom-reward-" + Date.now(),
        kind: "gift",
        title: "未命名獎勵",
        desc: "",
        cost: 0,
        stock: 0,
        icon: "fa-gift",
        tone: "green",
        status: "published",
        isCustom: true,
      },
      data
    );
    custom.push(item);
    writeCustomRewards(custom);
    return item;
  }

  /**
   * 兌換指定獎項:點數足夠則扣點並產生兌換紀錄,回傳 Promise<record|null>
   * (record 為 null 代表獎項不存在或點數不足)
   */
  function redeem(rewardId) {
    return getRewards().then(function (list) {
      var reward = list.find(function (r) { return r.id === rewardId; });
      if (!reward) {
        return null;
      }
      var spent = ns.walletService.spendPoints(reward.cost, "兌換:" + reward.title);
      if (!spent) {
        return null;
      }
      var record = {
        id: "rdm-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        rewardId: reward.id,
        code: generateCode(),
        date: new Date().toISOString().slice(0, 10),
      };
      var list2 = readRedemptions();
      list2.unshift(record);
      writeRedemptions(list2);
      return record;
    });
  }

  /** 取得我的兌換紀錄,並附上對應獎項資訊 */
  function getMyRedemptions() {
    return Promise.all([readRedemptions(), getRewards()]).then(function (results) {
      var redemptions = results[0];
      var rewards = results[1];
      return redemptions.map(function (r) {
        var reward = rewards.find(function (rw) { return rw.id === r.rewardId; });
        return Object.assign({}, r, { reward: reward || null });
      });
    });
  }

  ns.rewardService = {
    getRewards: getRewards,
    redeem: redeem,
    getMyRedemptions: getMyRedemptions,
    getAllRewardsForAdmin: getAllRewardsForAdmin,
    updateReward: updateReward,
    addCustomReward: addCustomReward,
  };
})(window.FunJia);
