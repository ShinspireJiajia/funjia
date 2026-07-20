/**
 * rewards-mall-page.js
 * 優惠商城頁(pages/rewards-mall.html)邏輯:切換折價券/兌換好禮分頁、
 * 兌換點數(呼叫 rewardService.redeem)、顯示兌換碼與我的兌換紀錄。
 */

(function () {
  "use strict";

  var state = { kind: "coupon" };

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;

    refreshBalance(ns);
    renderRewards(ns);
    renderRedemptions(ns);

    document.getElementById("rewardsTabs").addEventListener("click", function (e) {
      var tab = e.target.closest(".deals-tab");
      if (!tab) return;
      document.querySelectorAll("#rewardsTabs .deals-tab").forEach(function (t) {
        t.classList.remove("is-active");
      });
      tab.classList.add("is-active");
      state.kind = tab.getAttribute("data-kind");
      renderRewards(ns);
    });

    document.getElementById("rewardsList").addEventListener("click", function (e) {
      var btn = e.target.closest('[data-action="redeem"]');
      if (!btn || btn.hasAttribute("disabled")) return;
      var rewardId = btn.getAttribute("data-reward-id");
      ns.rewardService.redeem(rewardId).then(function (record) {
        if (!record) {
          showResult("兌換失敗,可能是點數不足,請確認後再試一次。", true);
          return;
        }
        showResult(
          '兌換成功!您的兌換碼:<br /><span class="code">' + record.code +
            "</span><br />請至店家出示此畫面完成兌換。",
          false
        );
        refreshBalance(ns);
        renderRewards(ns);
        renderRedemptions(ns);
      });
    });
  });

  function refreshBalance(ns) {
    document.getElementById("rewardsBalance").textContent = ns.walletService.getBalance() + " 點";
  }

  function showResult(html, isError) {
    var el = document.getElementById("rewardsResult");
    el.innerHTML = html;
    el.classList.add("is-visible");
    el.classList.toggle("is-error", !!isError);
  }

  function renderRewards(ns) {
    ns.rewardService.getRewards(state.kind).then(function (list) {
      var balance = ns.walletService.getBalance();
      ns.rewardCard.renderList(document.getElementById("rewardsList"), list, balance);
    });
  }

  function renderRedemptions(ns) {
    ns.rewardService.getMyRedemptions().then(function (list) {
      var container = document.getElementById("redemptionsList");
      if (!list.length) {
        container.innerHTML =
          '<div class="empty-state"><i class="fa-regular fa-face-smile"></i><p>還沒有兌換紀錄</p></div>';
        return;
      }
      container.innerHTML = list
        .map(function (item) {
          var title = item.reward ? item.reward.title : "(獎項資訊已更新)";
          return (
            '<div class="redemption-item">' +
            '<div class="redemption-item__body"><strong>' + escapeHtml(title) + "</strong><span>" + item.date + "</span></div>" +
            '<span class="redemption-item__code">' + item.code + "</span>" +
            "</div>"
          );
        })
        .join("");
    });
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
})();
