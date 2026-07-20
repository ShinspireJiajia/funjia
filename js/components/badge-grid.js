/**
 * badge-grid.js
 * 景點打卡任務徽章格線元件:顯示已解鎖/未解鎖徽章,點擊徽章開啟詳情卡,
 * 未解鎖徽章可透過瀏覽器 GPS 定位嘗試打卡,成功後即時更新解鎖狀態。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var GRADIENTS = {
    green: "linear-gradient(135deg, #3f7f4c, #1f4a2a)",
    orange: "linear-gradient(135deg, #e08a3c, #b85a1e)",
    blue: "linear-gradient(135deg, #3d7ea6, #1f4a63)",
    brown: "linear-gradient(135deg, #8a6642, #5c4326)",
    pink: "linear-gradient(135deg, #d97a9c, #a8496b)",
    teal: "linear-gradient(135deg, #2f8f82, #1a5a52)",
    gray: "linear-gradient(135deg, #6b7280, #3f4451)",
  };

  var FAIL_MESSAGE = {
    too_far: function (detail) {
      return "距離景點還有約 " + Math.max(0, Math.round(detail.distance - detail.badge.radius)) + " 公尺,請靠近後再試一次";
    },
    permission: function () {
      return "請允許瀏覽器定位權限後再試一次";
    },
    unsupported: function () {
      return "此瀏覽器不支援定位功能,請改用其他裝置打卡";
    },
    not_found: function () {
      return "找不到這個徽章任務,請重新整理頁面";
    },
  };

  var gridContainer = null;
  var sheetEl = null;
  var currentBadge = null;
  var toastTimer = null;

  function gradientOf(badge) {
    return GRADIENTS[badge.tone] || GRADIENTS.gray;
  }

  function buildCardHTML(badge) {
    return (
      '<button type="button" class="badge-item' + (badge.isUnlocked ? " is-unlocked" : "") + '" data-id="' + badge.id + '">' +
      '<span class="badge-item__icon" style="background:' + gradientOf(badge) + '">' +
      '<i class="fa-solid ' + badge.icon + '"></i>' +
      (badge.isUnlocked
        ? '<span class="badge-item__check"><i class="fa-solid fa-check"></i></span>'
        : '<span class="badge-item__lock"><i class="fa-solid fa-lock"></i></span>') +
      "</span>" +
      "<span class=\"badge-item__title\">" + badge.title + "</span>" +
      "</button>"
    );
  }

  function renderSummary(badges) {
    var unlockedCount = badges.filter(function (b) { return b.isUnlocked; }).length;
    var percent = badges.length ? Math.round((unlockedCount / badges.length) * 100) : 0;
    return (
      '<div class="badge-summary">' +
      '<div class="badge-summary__text"><strong>' + unlockedCount + " / " + badges.length + "</strong> 枚徽章已收集</div>" +
      '<div class="badge-summary__bar"><div class="badge-summary__bar-fill" style="width:' + percent + '%"></div></div>' +
      "</div>"
    );
  }

  function render(container, badges) {
    gridContainer = container;
    if (!badges || !badges.length) {
      container.innerHTML =
        '<div class="empty-state"><i class="fa-regular fa-face-frown"></i><p>目前尚無打卡任務</p></div>';
      return;
    }
    container.innerHTML = renderSummary(badges) + '<div class="badge-grid">' + badges.map(buildCardHTML).join("") + "</div>";
  }

  function refresh() {
    if (!gridContainer) {
      return;
    }
    ns.badgeService.getBadgesWithStatus().then(function (badges) {
      render(gridContainer, badges);
    });
  }

  function ensureSheet() {
    if (sheetEl) {
      return sheetEl;
    }
    sheetEl = document.createElement("div");
    sheetEl.className = "badge-sheet";
    sheetEl.innerHTML =
      '<div class="badge-sheet__backdrop" data-action="cancel"></div>' +
      '<div class="badge-sheet__panel" role="dialog" aria-modal="true">' +
      '<button type="button" class="badge-sheet__close" data-action="cancel" aria-label="關閉"><i class="fa-solid fa-xmark"></i></button>' +
      '<span class="badge-sheet__icon"></span>' +
      '<h3 class="badge-sheet__title"></h3>' +
      '<p class="badge-sheet__desc"></p>' +
      '<p class="badge-sheet__status"></p>' +
      '<p class="badge-sheet__message"></p>' +
      '<button type="button" class="btn btn-primary badge-sheet__action" data-action="primary"></button>' +
      "</div>" +
      '<div class="badge-sheet__toast"></div>';
    document.body.appendChild(sheetEl);

    sheetEl.addEventListener("click", function (event) {
      var action = event.target.closest("[data-action]");
      if (!action) {
        return;
      }
      if (action.dataset.action === "cancel") {
        closeSheet();
      } else if (action.dataset.action === "primary") {
        handlePrimaryAction();
      }
    });

    return sheetEl;
  }

  function closeSheet() {
    if (sheetEl) {
      sheetEl.classList.remove("is-open");
    }
    currentBadge = null;
  }

  function setSheetMessage(text, tone) {
    var el = sheetEl.querySelector(".badge-sheet__message");
    el.textContent = text || "";
    el.className = "badge-sheet__message" + (tone ? " is-" + tone : "");
  }

  function populateSheet(badge) {
    var el = ensureSheet();
    el.querySelector(".badge-sheet__icon").style.background = gradientOf(badge);
    el.querySelector(".badge-sheet__icon").innerHTML = '<i class="fa-solid ' + badge.icon + '"></i>';
    el.querySelector(".badge-sheet__title").textContent = badge.title;
    el.querySelector(".badge-sheet__desc").textContent = badge.desc;
    el.querySelector(".badge-sheet__status").textContent = badge.isUnlocked
      ? "已解鎖 · " + badge.unlockedAt
      : "尚未解鎖";
    setSheetMessage("");

    var actionBtn = el.querySelector(".badge-sheet__action");
    actionBtn.disabled = false;
    if (badge.isUnlocked) {
      actionBtn.innerHTML = '<i class="fa-solid fa-map-location-dot"></i> 查看景點頁面';
    } else {
      actionBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> 立即打卡';
    }
  }

  function openDetail(badgeId) {
    ns.badgeService.getBadgesWithStatus().then(function (list) {
      var badge = list.find(function (b) { return b.id === badgeId; });
      if (!badge) {
        return;
      }
      currentBadge = badge;
      var el = ensureSheet();
      populateSheet(badge);
      el.classList.add("is-open");
    });
  }

  function handlePrimaryAction() {
    if (!currentBadge) {
      return;
    }
    if (currentBadge.isUnlocked) {
      window.location.href = "detail.html?type=" + currentBadge.type + "&id=" + currentBadge.refId;
      return;
    }
    doCheckIn(currentBadge.id);
  }

  function doCheckIn(badgeId) {
    var el = ensureSheet();
    var actionBtn = el.querySelector(".badge-sheet__action");
    actionBtn.disabled = true;
    actionBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 定位中…';
    setSheetMessage("");

    ns.badgeService
      .checkIn(badgeId)
      .then(function (result) {
        showToast("🎉 已解鎖徽章:" + result.badge.title);
        closeSheet();
        refresh();
      })
      .catch(function (err) {
        var messageFn = FAIL_MESSAGE[err.reason] || function () { return "打卡失敗,請稍後再試"; };
        setSheetMessage(messageFn(err), "error");
        actionBtn.disabled = false;
        actionBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> 再試一次';
      });
  }

  function showToast(message) {
    var el = ensureSheet();
    var toastEl = el.querySelector(".badge-sheet__toast");
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("is-visible");
    }, 2600);
  }

  function init(container) {
    container.addEventListener("click", function (event) {
      var item = event.target.closest(".badge-item");
      if (!item) {
        return;
      }
      openDetail(item.dataset.id);
    });
  }

  ns.badgeGrid = {
    render: render,
    init: init,
  };
})(window.FunJia);
