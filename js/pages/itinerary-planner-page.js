/**
 * itinerary-planner-page.js
 * 智慧減碳排程頁(pages/itinerary-planner.html)邏輯:
 * 選擇景點(點選順序即為行程起點錨點)、設定天數與交通策略後,
 * 呼叫 itineraryPlannerService 產生分日行程建議,並可一鍵採用以獲得減碳點數。
 */

(function () {
  "use strict";

  var MODE_ICON = { walk: "fa-person-walking", bus: "fa-bus", transfer: "fa-bus", drive: "fa-car" };
  var MODE_LABEL = { walk: "步行", bus: "搭乘公車", transfer: "轉乘公車/小火車", drive: "自行開車" };
  var DAY_LENGTH_LABEL = { half: "半日遊", day: "一日遊", multi: "多日遊" };

  var state = {
    attractions: [],
    selectedIds: [], // 依點選順序排列,第一筆為行程起點錨點
    tripLength: "day",
    days: 2,
    strategy: "balanced",
    lastResult: null,
    adopted: false,
  };

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;

    ns.poiService.getList("attractions").then(function (list) {
      state.attractions = list;
      renderChips("");
    });

    document.getElementById("attractionSearch").addEventListener("input", function (e) {
      renderChips(e.target.value.trim());
    });

    bindToggle("tripLengthToggle", "length", function (value) {
      state.tripLength = value;
      document.getElementById("dayStepperField").style.display = value === "multi" ? "flex" : "none";
    });

    bindToggle("strategyToggle", "strategy", function (value) {
      state.strategy = value;
    });

    document.getElementById("dayCountInput").addEventListener("change", function (e) {
      var value = Math.min(7, Math.max(2, parseInt(e.target.value, 10) || 2));
      e.target.value = value;
      state.days = value;
    });

    document.getElementById("plannerForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var hint = document.getElementById("selectedHint");
      if (!state.selectedIds.length) {
        hint.textContent = "請至少選擇一個景點,才能開始排程。";
        hint.classList.add("is-error");
        return;
      }
      hint.classList.remove("is-error");

      ns.itineraryPlannerService
        .planItinerary({
          attractionIds: state.selectedIds,
          tripLength: state.tripLength,
          days: state.days,
          strategy: state.strategy,
        })
        .then(function (result) {
          state.lastResult = result;
          state.adopted = false;
          renderResult(ns, result);
        });
    });
  });

  function bindToggle(containerId, dataKey, onChange) {
    var buttons = document.querySelectorAll("#" + containerId + " .mode-btn");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) {
          b.classList.remove("is-active");
        });
        btn.classList.add("is-active");
        onChange(btn.getAttribute("data-" + dataKey));
      });
    });
  }

  function renderChips(keyword) {
    var container = document.getElementById("attractionSuggestions");
    var pool = state.attractions;
    var matches;

    if (!keyword) {
      matches = pool;
    } else {
      var lower = keyword.toLowerCase();
      matches = pool.filter(function (item) {
        return (
          item.name.toLowerCase().indexOf(lower) !== -1 ||
          (item.category || "").toLowerCase().indexOf(lower) !== -1 ||
          (item.tags || []).some(function (tag) {
            return tag.toLowerCase().indexOf(lower) !== -1;
          })
        );
      });
    }

    if (!matches.length) {
      container.innerHTML = '<p class="field-hint">找不到符合的景點,換個關鍵字試試。</p>';
      return;
    }

    container.innerHTML = matches
      .map(function (item) {
        var added = state.selectedIds.indexOf(item.id) !== -1;
        return (
          '<button type="button" class="spot-chip' +
          (added ? " is-added" : "") +
          '" data-spot-id="' +
          item.id +
          '"><i class="fa-solid ' +
          (added ? "fa-check" : "fa-plus") +
          '"></i> ' +
          escapeHtml(item.name) +
          '<span class="spot-chip__category">' +
          escapeHtml(item.category || "") +
          "</span></button>"
        );
      })
      .join("");

    container.querySelectorAll(".spot-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        toggleSelect(chip.getAttribute("data-spot-id"));
        renderChips(document.getElementById("attractionSearch").value.trim());
      });
    });
  }

  function toggleSelect(id) {
    var index = state.selectedIds.indexOf(id);
    if (index !== -1) {
      state.selectedIds.splice(index, 1);
    } else {
      state.selectedIds.push(id);
    }
    renderSelectedList();
  }

  function renderSelectedList() {
    var container = document.getElementById("selectedAttractionsList");
    var hint = document.getElementById("selectedHint");

    if (!state.selectedIds.length) {
      container.innerHTML = "";
      hint.textContent = "尚未選擇任何景點,請從上方點選加入。";
      hint.classList.remove("is-error");
      return;
    }

    hint.textContent = "已選擇 " + state.selectedIds.length + " 個景點,第 1 個將作為行程起點。";
    hint.classList.remove("is-error");

    container.innerHTML = state.selectedIds
      .map(function (id, index) {
        var item = state.attractions.find(function (a) {
          return a.id === id;
        });
        if (!item) return "";
        return (
          '<div class="custom-stop-item"><span class="custom-stop-item__order">' +
          (index + 1) +
          '</span><div class="custom-stop-item__body"><strong>' +
          escapeHtml(item.name) +
          "</strong>" +
          '<span>' + escapeHtml(item.category || "") + "</span>" +
          '</div><button type="button" class="custom-stop-item__remove" data-remove-id="' +
          id +
          '" aria-label="移除"><i class="fa-solid fa-xmark"></i></button></div>'
        );
      })
      .join("");

    container.querySelectorAll("[data-remove-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        toggleSelect(btn.getAttribute("data-remove-id"));
        renderChips(document.getElementById("attractionSearch").value.trim());
      });
    });
  }

  function formatClock(minutes) {
    var normalized = ((minutes % 1440) + 1440) % 1440;
    var hh = Math.floor(normalized / 60);
    var mm = normalized % 60;
    return (hh < 10 ? "0" + hh : hh) + ":" + (mm < 10 ? "0" + mm : mm);
  }

  function renderResult(ns, result) {
    var container = document.getElementById("planResult");
    if (!result) {
      container.innerHTML = '<div class="empty-state"><i class="fa-regular fa-face-frown"></i><p>無法產生行程建議,請重新選擇景點。</p></div>';
      return;
    }

    var savedKg = (result.carbonSavedG / 1000).toFixed(1);
    var totalKg = (result.totalCarbonG / 1000).toFixed(1);
    var hours = Math.floor(result.totalMinutes / 60);
    var minutes = result.totalMinutes % 60;

    var unplacedHTML =
      result.unplaced && result.unplaced.length
        ? '<div class="field-hint is-error">「' +
          result.unplaced.map(function (p) { return escapeHtml(p.name); }).join("、") +
          '」尚未設定座標,暫無法排入行程動線。</div>'
        : "";

    var summaryHTML =
      '<div class="card plan-summary">' +
      '<div class="plan-summary__tile"><strong>' + result.days.length + " 天</strong><span>" + DAY_LENGTH_LABEL[state.tripLength] + "</span></div>" +
      '<div class="plan-summary__tile"><strong>' + result.totalDistanceKm.toFixed(1) + " 公里</strong><span>總移動距離</span></div>" +
      '<div class="plan-summary__tile"><strong>' + hours + " 時 " + minutes + " 分</strong><span>總行程時間</span></div>" +
      '<div class="plan-summary__saved"><i class="fa-solid fa-leaf"></i> 相較全程自駕減碳 ' + savedKg + " kg(本行程碳排約 " + totalKg + " kg),可獲得 " + result.pointsEarned + " 點減碳點數</div>" +
      "</div>";

    var daysHTML = result.days
      .map(function (day, index) {
        var itemsHTML = day.items.map(buildItemHTML).join("");
        return (
          '<div class="card day-block"><div class="day-block__header">第 ' + (index + 1) + " 天</div>" +
          '<div class="day-block__items">' + itemsHTML + "</div></div>"
        );
      })
      .join("");

    var adoptDisabled = state.adopted ? " disabled" : "";
    var adoptLabel = state.adopted ? "已採用此行程" : "採用此行程,獲得 " + result.pointsEarned + " 點";

    container.innerHTML =
      unplacedHTML +
      summaryHTML +
      daysHTML +
      '<button type="button" class="btn btn-primary plan-adopt-btn" id="adoptPlanBtn"' + adoptDisabled + ">" +
      '<i class="fa-solid fa-check"></i> ' + adoptLabel + "</button>" +
      '<div class="plan-adopt-result" id="adoptResult"></div>';

    var adoptBtn = document.getElementById("adoptPlanBtn");
    if (adoptBtn && !state.adopted) {
      adoptBtn.addEventListener("click", function () {
        if (state.adopted) return;
        ns.walletService.addPoints(result.pointsEarned, "採用低碳行程建議(減碳 " + savedKg + " kg)");
        state.adopted = true;
        adoptBtn.setAttribute("disabled", "disabled");
        adoptBtn.innerHTML = '<i class="fa-solid fa-check"></i> 已採用此行程';
        var resultEl = document.getElementById("adoptResult");
        resultEl.classList.add("is-visible");
        resultEl.innerHTML =
          '已獲得 <strong>' + result.pointsEarned + ' 點</strong> 減碳點數!前往 <a href="carbon-wallet.html">減碳錢包</a> 查看。';
      });
    }
  }

  function buildItemHTML(item) {
    if (item.kind === "travel") {
      return (
        '<div class="plan-item kind-travel"><span class="plan-item__icon"><i class="fa-solid ' + MODE_ICON[item.mode] + '"></i></span>' +
        '<div class="plan-item__body"><p>' + MODE_LABEL[item.mode] + " 前往 " + escapeHtml(item.toName) + "</p><span>" +
        formatClock(item.arrivalMin) + "–" + formatClock(item.departureMin) + " · 約 " + item.minutes + " 分鐘 · " +
        item.distanceKm.toFixed(1) + " 公里 · 碳排 " + Math.round(item.carbonG) + " g</span></div></div>"
      );
    }
    if (item.kind === "attraction") {
      return (
        '<div class="plan-item kind-attraction"><span class="plan-item__icon"><i class="fa-solid fa-location-dot"></i></span>' +
        '<div class="plan-item__body"><p>' + escapeHtml(item.poi.name) + "</p><span>" +
        formatClock(item.arrivalMin) + "–" + formatClock(item.departureMin) + " · 停留約 " + item.dwellMinutes + " 分鐘</span></div></div>"
      );
    }
    if (item.kind === "meal") {
      return (
        '<div class="plan-item kind-meal"><span class="plan-item__icon"><i class="fa-solid fa-utensils"></i></span>' +
        '<div class="plan-item__body"><p>推薦用餐:' + escapeHtml(item.poi.name) + "</p><span>" +
        formatClock(item.arrivalMin) + "–" + formatClock(item.departureMin) + " · 建議用餐時段</span></div></div>"
      );
    }
    if (item.kind === "lodging") {
      return (
        '<div class="plan-item kind-lodging"><span class="plan-item__icon"><i class="fa-solid fa-bed"></i></span>' +
        '<div class="plan-item__body"><p>推薦住宿:' + escapeHtml(item.poi.name) + "</p><span>" +
        escapeHtml(item.poi.priceRange || "") + "</span></div></div>"
      );
    }
    if (item.kind === "parking") {
      return (
        '<div class="plan-item kind-parking"><span class="plan-item__icon"><i class="fa-solid fa-square-parking"></i></span>' +
        '<div class="plan-item__body"><p>建議停車:' + escapeHtml(item.poi.name) + "</p><span>" +
        escapeHtml(item.note || "") + "</span></div></div>"
      );
    }
    return "";
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
})();
