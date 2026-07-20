/**
 * admin-dashboard-page.js
 * 後台「流量數據儀表板」頁(pages/admin-dashboard.html)邏輯:
 * 彙整現有服務層的真實資料(已上架 POI 數、投稿待審核數、示範錢包餘額、
 * 兌換紀錄、景點評分排行)呈現總覽,避免顯示未經追蹤的假流量數字。
 */

(function () {
  "use strict";

  var TYPES = ["attractions", "shops", "lodging", "events"];

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;

    Promise.all(TYPES.map(function (type) { return ns.poiService.getAllForAdmin(type); })).then(function (results) {
      var allPoi = [].concat(results[0], results[1], results[2], results[3]);
      var publishedCount = allPoi.filter(function (i) { return i.status === "published"; }).length;
      var pendingSubmissions = TYPES.reduce(function (sum, type) { return sum + ns.userPoiService.getAll(type).length; }, 0);

      renderStats(ns, publishedCount, pendingSubmissions);
      renderRanking(results[0]); // 以景點評分排行
    });

    ns.rewardService.getMyRedemptions().then(renderRedemptionRanking);
    renderWalletTrend(ns);
  });

  function renderStats(ns, publishedCount, pendingSubmissions) {
    var balance = ns.walletService.getBalance();
    var redemptionCountPromise = ns.rewardService.getMyRedemptions().then(function (r) { return r.length; });

    redemptionCountPromise.then(function (redemptionCount) {
      var tiles = [
        { label: "已上架 POI 總數", value: publishedCount, note: "景點/店家/住宿/活動" },
        { label: "使用者投稿待審核", value: pendingSubmissions, note: "前往「使用者投稿審核」處理" },
        { label: "示範錢包餘額", value: balance + " 點", note: "單一裝置示範資料" },
        { label: "累計兌換次數", value: redemptionCount, note: "本機兌換紀錄" },
      ];
      document.getElementById("statRow").innerHTML = tiles
        .map(function (t) {
          return (
            '<div class="adm-stat-card"><div class="label">' + t.label + '</div><div class="value">' +
            t.value + '</div><div class="delta">' + t.note + "</div></div>"
          );
        })
        .join("");
    });
  }

  function renderRanking(attractions) {
    var top = attractions
      .filter(function (a) { return typeof a.rating === "number"; })
      .sort(function (a, b) { return b.rating - a.rating; })
      .slice(0, 6);

    var area = document.getElementById("rankArea");
    if (!top.length) {
      area.innerHTML = '<p class="adm-hint">目前沒有評分資料。</p>';
      return;
    }
    area.innerHTML =
      '<div class="adm-bar-list">' +
      top
        .map(function (a) {
          var pct = (a.rating / 5) * 100;
          return (
            '<div class="adm-bar-row"><span>' + escapeHtml(a.name) + '</span><div class="adm-bar-track">' +
            '<div class="adm-bar-fill" style="width:' + pct + '%"></div></div><span class="adm-bar-num">' + a.rating + "</span></div>"
          );
        })
        .join("") +
      "</div>";
  }

  function renderRedemptionRanking(records) {
    var area = document.getElementById("redemptionRankArea");
    if (!records.length) {
      area.innerHTML = '<p class="adm-hint">目前沒有任何兌換紀錄。</p>';
      return;
    }
    var counts = {};
    records.forEach(function (r) {
      if (!r.reward) return;
      counts[r.reward.title] = (counts[r.reward.title] || 0) + 1;
    });
    var entries = Object.keys(counts)
      .map(function (title) { return { title: title, count: counts[title] }; })
      .sort(function (a, b) { return b.count - a.count; });
    var maxCount = entries[0] ? entries[0].count : 1;

    area.innerHTML =
      '<div class="adm-bar-list">' +
      entries
        .map(function (e) {
          return (
            '<div class="adm-bar-row"><span>' + escapeHtml(e.title) + '</span><div class="adm-bar-track">' +
            '<div class="adm-bar-fill" style="width:' + ((e.count / maxCount) * 100) + '%"></div></div><span class="adm-bar-num">' + e.count + "</span></div>"
          );
        })
        .join("") +
      "</div>";
  }

  function renderWalletTrend(ns) {
    var history = ns.walletService.getHistory().slice(0, 12).reverse();
    var area = document.getElementById("walletTrendArea");
    if (!history.length) {
      area.innerHTML = '<p class="adm-hint">示範錢包目前沒有任何點數異動紀錄。</p>';
      return;
    }
    var maxAbs = Math.max.apply(null, history.map(function (h) { return Math.abs(h.delta); })) || 1;
    area.innerHTML =
      '<div class="adm-spark" style="height:56px;">' +
      history
        .map(function (h, index) {
          var heightPct = Math.max(8, (Math.abs(h.delta) / maxAbs) * 100);
          var isLast = index === history.length - 1;
          return '<i style="height:' + heightPct + "%;" + (isLast ? "background:var(--adm-primary);" : "") + '" title="' + escapeHtml(h.date) + " " + escapeHtml(h.reason) + " (" + h.delta + ")\"></i>";
        })
        .join("") +
      "</div>";
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
})();
