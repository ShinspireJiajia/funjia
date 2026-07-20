/**
 * itinerary-plan-page.js
 * 行程計畫詳情頁(pages/itinerary-plan.html)邏輯:透過網址 ?code= 讀取單一旅遊計畫,
 * 顯示已設定的行程(平台計算的最佳動線或已排定站點清單),並提供編輯行程/刪除行程/
 * 邀請好友等與該行程相關的操作。由「我的旅遊計畫」卡片點擊「查看行程計畫」進入。
 */

(function () {
  "use strict";

  var MODE_ICON = { walk: "fa-person-walking", bus: "fa-bus", transfer: "fa-bus", drive: "fa-car" };
  var MODE_LABEL = { walk: "步行", bus: "搭乘公車", transfer: "轉乘公車/小火車", drive: "自行開車" };
  var DAY_LENGTH_LABEL = { half: "半日遊", day: "一日遊", multi: "多日遊" };

  var editState = null; // { stops: [{name, note}] },僅在編輯面板開啟時存在

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;
    var code = getCodeFromQuery();
    var group = code ? ns.groupService.getGroupByCode(code) : null;

    if (!group) {
      document.getElementById("planNotFound").style.display = "block";
      return;
    }

    document.getElementById("planContent").style.display = "block";
    renderHeader(group);
    renderStopsArea(group);
    renderActions(ns, group);
  });

  function getCodeFromQuery() {
    var params = new URLSearchParams(window.location.search);
    return params.get("code");
  }

  function renderHeader(group) {
    var el = document.getElementById("planHeader");
    el.innerHTML =
      '<div class="plan-detail__title-row"><strong>' +
      escapeHtml(group.name) +
      '</strong><span class="plan-detail__code">' +
      group.code +
      "</span></div>" +
      '<p><i class="fa-regular fa-calendar"></i> ' +
      (group.date || "尚未指定日期") +
      "</p>" +
      (group.itineraryTitle ? '<p><i class="fa-solid fa-route"></i> ' + escapeHtml(group.itineraryTitle) + "</p>" : "") +
      '<p><i class="fa-solid fa-users"></i> 成員:' +
      escapeHtml(group.members.join("、")) +
      "</p>";
  }

  function renderStopsArea(group) {
    var el = document.getElementById("planStopsHtml");
    if (group.plan) {
      el.innerHTML = buildPlanResultHTML(group.plan, group.tripLength || "day");
    } else if (group.stops && group.stops.length) {
      el.innerHTML = buildScheduledStopsHTML(group.stops);
    } else {
      el.innerHTML = '<div class="empty-state"><i class="fa-regular fa-map"></i><p>這個旅遊計畫尚未設定行程站點。</p></div>';
    }
  }

  // -------- 相關操作:邀請好友 / 編輯行程 / 刪除行程 --------
  function renderActions(ns, group) {
    var el = document.getElementById("planActions");
    var isOwner = ns.groupService.isOwner(group.code);

    var shareHtml = group.inviteEnabled
      ? '<button type="button" class="btn btn-accent btn-sm" data-action="share-fb"><i class="fa-brands fa-facebook"></i> 分享 FB</button>' +
        '<button type="button" class="btn btn-outline btn-sm" data-action="copy-link"><i class="fa-solid fa-link"></i> 複製連結</button>'
      : '<button type="button" class="btn btn-outline btn-sm" data-action="enable-invite"><i class="fa-solid fa-user-plus"></i> 邀請好友</button>';

    var ownerHtml = isOwner
      ? '<button type="button" class="btn btn-outline btn-sm" data-action="toggle-edit"><i class="fa-solid fa-pen-to-square"></i> 編輯行程</button>' +
        '<button type="button" class="btn btn-outline btn-sm btn-danger" data-action="delete-group"><i class="fa-solid fa-trash"></i> 刪除行程</button>'
      : "";

    el.innerHTML = '<div class="share-actions">' + shareHtml + ownerHtml + "</div>";
    bindActionEvents(ns, group, el);
  }

  function bindActionEvents(ns, group, scopeEl) {
    var fbBtn = scopeEl.querySelector('[data-action="share-fb"]');
    if (fbBtn) {
      fbBtn.addEventListener("click", function () {
        shareToFacebook(group.code, group.name);
      });
    }

    var copyBtn = scopeEl.querySelector('[data-action="copy-link"]');
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        copyInviteLink(group.code, copyBtn);
      });
    }

    var enableBtn = scopeEl.querySelector('[data-action="enable-invite"]');
    if (enableBtn) {
      enableBtn.addEventListener("click", function () {
        ns.groupService.enableInvite(group.code);
        group.inviteEnabled = true;
        renderActions(ns, group);
      });
    }

    var editBtn = scopeEl.querySelector('[data-action="toggle-edit"]');
    if (editBtn) {
      editBtn.addEventListener("click", function () {
        toggleEditPanel(ns, group);
      });
    }

    var deleteBtn = scopeEl.querySelector('[data-action="delete-group"]');
    if (deleteBtn) {
      deleteBtn.addEventListener("click", function () {
        deleteGroup(ns, group);
      });
    }
  }

  // -------- 編輯行程(名稱 / 日期 / 站點) --------
  function toggleEditPanel(ns, group) {
    var panel = document.getElementById("planEdit");
    var opening = panel.style.display === "none";
    if (opening) {
      editState = { stops: (group.stops || []).slice() };
      panel.innerHTML = buildEditHTML(group);
      bindEditEvents(ns, group);
    } else {
      editState = null;
    }
    panel.style.display = opening ? "block" : "none";
  }

  function buildEditHTML(group) {
    return (
      '<div class="form-field"><label>行程名稱</label><input type="text" class="edit-name" value="' +
      escapeHtml(group.name) +
      '" /></div>' +
      '<div class="form-field"><label>出遊日期</label><input type="date" class="edit-date" value="' +
      (group.date || "") +
      '" /></div>' +
      '<div class="form-field"><label>行程站點</label><div class="custom-stops" id="editStopsList"></div>' +
      '<div class="custom-stop-add"><input type="text" id="editStopInput" placeholder="新增站點名稱" />' +
      '<button type="button" class="btn btn-outline btn-sm" id="editAddStopBtn"><i class="fa-solid fa-plus"></i> 加入</button></div></div>' +
      '<div class="edit-panel__actions"><button type="button" class="btn btn-primary btn-sm" id="editSaveBtn"><i class="fa-solid fa-check"></i> 儲存變更</button></div>'
    );
  }

  function renderEditStopsList() {
    var container = document.getElementById("editStopsList");
    if (!container || !editState) return;
    var stops = editState.stops;
    if (!stops.length) {
      container.innerHTML = '<p class="field-hint">尚未加入任何站點。</p>';
      return;
    }
    container.innerHTML = stops
      .map(function (stop, index) {
        return (
          '<div class="custom-stop-item"><span class="custom-stop-item__order">' +
          (index + 1) +
          '</span><div class="custom-stop-item__body"><strong>' +
          escapeHtml(stop.name) +
          "</strong>" +
          (stop.note ? "<span>" + escapeHtml(stop.note) + "</span>" : "") +
          '</div><button type="button" class="custom-stop-item__remove" data-remove-index="' +
          index +
          '" aria-label="移除"><i class="fa-solid fa-xmark"></i></button></div>'
        );
      })
      .join("");
  }

  function bindEditEvents(ns, group) {
    renderEditStopsList();

    document.getElementById("editAddStopBtn").addEventListener("click", function () {
      var input = document.getElementById("editStopInput");
      var name = input.value.trim();
      if (!name) return;
      editState.stops.push({ name: name, note: "手動新增" });
      input.value = "";
      renderEditStopsList();
    });

    document.getElementById("editStopsList").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-remove-index]");
      if (!btn) return;
      editState.stops.splice(Number(btn.getAttribute("data-remove-index")), 1);
      renderEditStopsList();
    });

    document.getElementById("editSaveBtn").addEventListener("click", function () {
      var name = document.querySelector("#planEdit .edit-name").value.trim();
      var date = document.querySelector("#planEdit .edit-date").value;
      if (!name) return;
      var updated = ns.groupService.updateGroup(group.code, { name: name, date: date, stops: editState.stops });
      if (!updated) return;
      group.name = updated.name;
      group.date = updated.date;
      group.stops = updated.stops;
      editState = null;
      document.getElementById("planEdit").style.display = "none";
      renderHeader(group);
      renderStopsArea(group);
    });
  }

  function deleteGroup(ns, group) {
    var confirmed = window.confirm("確定要刪除「" + group.name + "」這個旅遊計畫嗎?此動作無法復原。");
    if (!confirmed) return;
    ns.groupService.deleteGroup(group.code);
    window.location.href = "group-travel.html";
  }

  // -------- 分享 / 邀請 --------
  function buildInviteUrl(code) {
    return (
      window.location.href.split("?")[0].replace(/itinerary-plan\.html$/, "group-travel.html") +
      "?code=" +
      encodeURIComponent(code)
    );
  }

  function shareToFacebook(code, name) {
    var url = buildInviteUrl(code);
    var quote = "一起加入我的嘉義揪團行程「" + name + "」吧!代碼:" + code;
    var fbUrl =
      "https://www.facebook.com/sharer/sharer.php?u=" +
      encodeURIComponent(url) +
      "&quote=" +
      encodeURIComponent(quote);
    window.open(fbUrl, "_blank", "noopener,width=600,height=500");
  }

  function copyInviteLink(code, triggerEl) {
    var url = buildInviteUrl(code);
    var done = function () {
      if (!triggerEl) return;
      var original = triggerEl.innerHTML;
      triggerEl.innerHTML = '<i class="fa-solid fa-check"></i> 已複製';
      setTimeout(function () {
        triggerEl.innerHTML = original;
      }, 1800);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () {
        window.prompt("複製邀請連結:", url);
      });
    } else {
      window.prompt("複製邀請連結:", url);
    }
  }

  // -------- 行程呈現(與智慧減碳排程頁 itinerary-planner-page.js 共用同一套呈現方式) --------
  function buildPlanResultHTML(plan, tripLengthKey) {
    if (!plan || !plan.days) return "";

    var savedKg = (plan.carbonSavedG / 1000).toFixed(1);
    var totalKg = (plan.totalCarbonG / 1000).toFixed(1);
    var hours = Math.floor(plan.totalMinutes / 60);
    var minutes = plan.totalMinutes % 60;
    var lengthLabel = DAY_LENGTH_LABEL[tripLengthKey] || DAY_LENGTH_LABEL.day;

    var unplacedHtml =
      plan.unplaced && plan.unplaced.length
        ? '<p class="plan-summary__unplaced"><i class="fa-solid fa-triangle-exclamation"></i> 未能定位、暫未排入動線:' +
          plan.unplaced
            .map(function (p) {
              return escapeHtml(p.name);
            })
            .join("、") +
          "</p>"
        : "";

    var summaryHTML =
      '<div class="card plan-summary">' +
      '<div class="plan-summary__tile"><strong>' +
      plan.days.length +
      " 天</strong><span>" +
      lengthLabel +
      "</span></div>" +
      '<div class="plan-summary__tile"><strong>' +
      plan.totalDistanceKm.toFixed(1) +
      " 公里</strong><span>總移動距離</span></div>" +
      '<div class="plan-summary__tile"><strong>' +
      hours +
      " 時 " +
      minutes +
      " 分</strong><span>總行程時間</span></div>" +
      '<div class="plan-summary__saved"><i class="fa-solid fa-leaf"></i> 相較全程自駕減碳 ' +
      savedKg +
      " kg(本行程碳排約 " +
      totalKg +
      " kg),可獲得 " +
      plan.pointsEarned +
      " 點減碳點數</div>" +
      unplacedHtml +
      "</div>";

    var daysHTML = plan.days
      .map(function (day, index) {
        var itemsHTML = day.items.map(buildPlanItemHTML).join("");
        return (
          '<div class="card day-block"><div class="day-block__header">第 ' +
          (index + 1) +
          " 天</div>" +
          '<div class="day-block__items">' +
          itemsHTML +
          "</div></div>"
        );
      })
      .join("");

    return summaryHTML + daysHTML;
  }

  function buildPlanItemHTML(item) {
    if (item.kind === "travel") {
      return (
        '<div class="plan-item kind-travel"><span class="plan-item__icon"><i class="fa-solid ' +
        MODE_ICON[item.mode] +
        '"></i></span>' +
        '<div class="plan-item__body"><p>' +
        MODE_LABEL[item.mode] +
        " 前往 " +
        escapeHtml(item.toName) +
        "</p><span>" +
        formatClock(item.arrivalMin) +
        "–" +
        formatClock(item.departureMin) +
        " · 約 " +
        item.minutes +
        " 分鐘 · " +
        item.distanceKm.toFixed(1) +
        " 公里 · 碳排 " +
        Math.round(item.carbonG) +
        " g</span></div></div>"
      );
    }
    if (item.kind === "attraction") {
      return (
        '<div class="plan-item kind-attraction"><span class="plan-item__icon"><i class="fa-solid fa-location-dot"></i></span>' +
        '<div class="plan-item__body"><p>' +
        escapeHtml(item.poi.name) +
        "</p><span>" +
        formatClock(item.arrivalMin) +
        "–" +
        formatClock(item.departureMin) +
        " · 停留約 " +
        item.dwellMinutes +
        " 分鐘</span></div></div>"
      );
    }
    if (item.kind === "meal") {
      return (
        '<div class="plan-item kind-meal"><span class="plan-item__icon"><i class="fa-solid fa-utensils"></i></span>' +
        '<div class="plan-item__body"><p>推薦用餐:' +
        escapeHtml(item.poi.name) +
        "</p><span>" +
        formatClock(item.arrivalMin) +
        "–" +
        formatClock(item.departureMin) +
        " · 建議用餐時段</span></div></div>"
      );
    }
    if (item.kind === "lodging") {
      return (
        '<div class="plan-item kind-lodging"><span class="plan-item__icon"><i class="fa-solid fa-bed"></i></span>' +
        '<div class="plan-item__body"><p>推薦住宿:' +
        escapeHtml(item.poi.name) +
        "</p><span>" +
        escapeHtml(item.poi.priceRange || "") +
        "</span></div></div>"
      );
    }
    if (item.kind === "parking") {
      return (
        '<div class="plan-item kind-parking"><span class="plan-item__icon"><i class="fa-solid fa-square-parking"></i></span>' +
        '<div class="plan-item__body"><p>建議停車:' +
        escapeHtml(item.poi.name) +
        "</p><span>" +
        escapeHtml(item.note || "") +
        "</span></div></div>"
      );
    }
    return "";
  }

  function buildScheduledStopsHTML(stops) {
    if (!stops || !stops.length) return "";
    return (
      '<div class="stops-preview">' +
      '<p class="stops-preview__title"><i class="fa-solid fa-route"></i> 已排定的行程</p>' +
      stops
        .map(function (s) {
          return (
            '<div class="stops-preview__item"><strong>' +
            escapeHtml(s.name) +
            "</strong>" +
            (s.note ? "<span>" + escapeHtml(s.note) + "</span>" : "") +
            "</div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function formatClock(minutesSinceMidnight) {
    var h = Math.floor(minutesSinceMidnight / 60) % 24;
    var m = minutesSinceMidnight % 60;
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
})();
