/**
 * group-travel-page.js
 * 揪團旅行頁(pages/group-travel.html)邏輯:建立揪團(4 步驟精靈:基本設定 → 挑選景點 →
 * 規劃動線 → 建立揪團)/ 我的旅遊計畫(加入揪團 + 我建立/加入的行程清單)。
 * demo 階段以 localStorage 模擬,同一瀏覽器內建立與加入都會出現在「我的旅遊計畫」。
 */

(function () {
  "use strict";

  var NICKNAME_KEY = "funjia_nickname";
  var TOTAL_STEPS = 4;

  var state = {
    customStops: [], // [{name, note, lat?, lng?, category?, address?, sourceId?}]
    attractions: [],
    tripLength: "day", // "half" | "day" | "multi"(以「智慧減碳排程」為主要規劃方式)
    days: 2,
    strategy: "balanced",
    plan: null, // itineraryPlannerService.planItinerary() 產出的最佳動線結果
    planAdopted: false, // 是否已在建立前的動線預覽中採用行程、領取減碳點數
    seedItineraryId: null, // 若行程是「帶入」自某 Fun 嘉推薦行程而來,記錄來源 id/title
    seedItineraryTitle: null,
    seedLodgingNote: null, // 從推薦行程帶入時,若有站點是住宿標記,提示改由系統自動安排
  };

  var currentStep = 1;

  var MODE_ICON = { walk: "fa-person-walking", bus: "fa-bus", transfer: "fa-bus", drive: "fa-car" };
  var MODE_LABEL = { walk: "步行", bus: "搭乘公車", transfer: "轉乘公車/小火車", drive: "自行開車" };
  var DAY_LENGTH_LABEL = { half: "半日遊", day: "一日遊", multi: "多日遊" };

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;

    bindTabs();
    bindWizardNav();
    loadItineraryCache(ns);
    loadSpotSuggestions(ns);
    bindManualAddToggle();
    bindCustomStopControls();
    bindSelectedStopsBar();
    bindRouteOptions();
    initStopsSortable();
    prefillNickname();
    prefillJoinCodeFromQuery();
    openTabFromQuery();
    renderMyGroups(ns);
    bindFunJiaPanel(ns);
    bindMyFavoritesPanel(ns);
    syncCustomStops();

    document.getElementById("createForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var nameInput = document.getElementById("createName");
      var name = nameInput.value.trim();
      var date = document.getElementById("createDate").value;
      var creatorName = document.getElementById("createNickname").value.trim();
      var inviteEnabled = document.getElementById("inviteFriendsCheckbox").checked;

      if (!name) {
        goToStep(1);
        nameInput.reportValidity();
        return;
      }
      if (!state.customStops.length) {
        goToStep(2);
        return;
      }
      if (!creatorName) {
        document.getElementById("createNickname").reportValidity();
        return;
      }

      var group = ns.groupService.createGroup({
        name: name,
        date: date,
        creatorName: creatorName,
        mode: "custom",
        stops: state.customStops.slice(),
        plan: state.plan,
        tripLength: state.tripLength,
        inviteEnabled: inviteEnabled,
        itineraryId: state.seedItineraryId || null,
        itineraryTitle: state.seedItineraryTitle || null,
      });

      saveNickname(creatorName);
      renderCreateResult(group, inviteEnabled);

      document.getElementById("createForm").reset();
      document.getElementById("createNickname").value = creatorName;
      document.getElementById("inviteFriendsCheckbox").checked = true;
      resetWizard();
      renderMyGroups(ns);
    });

    document.getElementById("joinToggleBtn").addEventListener("click", function () {
      document.getElementById("joinForm").classList.toggle("is-open");
    });

    document.getElementById("joinForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var code = document.getElementById("joinCode").value.trim();
      var nickname = document.getElementById("joinNickname").value.trim();
      var errorEl = document.getElementById("joinError");
      var resultEl = document.getElementById("joinResult");

      if (!code || !nickname) return;

      var group = ns.groupService.joinGroup(code, nickname);
      if (!group) {
        errorEl.textContent = "找不到這個揪團代碼,請確認後再試一次。";
        errorEl.classList.add("is-visible");
        resultEl.classList.remove("is-visible");
        return;
      }
      errorEl.classList.remove("is-visible");
      resultEl.classList.add("is-visible");
      resultEl.innerHTML =
        "已加入「" + escapeHtml(group.name) + "」!目前成員:" + escapeHtml(group.members.join("、"));

      saveNickname(nickname);
      document.getElementById("joinForm").reset();
      document.getElementById("joinForm").classList.remove("is-open");
      renderMyGroups(ns);
    });

  });

  function bindTabs() {
    var tabs = document.querySelectorAll(".group-tab");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) {
          t.classList.remove("is-active");
        });
        tab.classList.add("is-active");
        document.querySelectorAll(".group-panel").forEach(function (panel) {
          panel.classList.toggle("is-active", panel.id === tab.getAttribute("data-panel"));
        });
      });
    });
  }

  // -------- 建立揪團:4 步驟精靈的導覽(進度條 / 上一步 / 下一步) --------
  function bindWizardNav() {
    document.querySelectorAll("[data-next-step]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.disabled) return;
        if (!validateStep(currentStep)) return;
        goToStep(Number(btn.getAttribute("data-next-step")));
      });
    });
    document.querySelectorAll("[data-prev-step]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        goToStep(Number(btn.getAttribute("data-prev-step")));
      });
    });
  }

  /** 離開目前步驟前的檢查:Step1 需填行程名稱,Step2 至少選 1 個景點 */
  function validateStep(step) {
    if (step === 1) {
      var name = document.getElementById("createName");
      if (!name.value.trim()) {
        name.reportValidity();
        return false;
      }
    }
    if (step === 2 && !state.customStops.length) {
      return false;
    }
    return true;
  }

  function goToStep(step) {
    if (step === 4) renderStep4Preview();
    currentStep = step;
    document.querySelectorAll(".wizard-step").forEach(function (el) {
      el.classList.toggle("is-active", Number(el.getAttribute("data-step")) === step);
    });
    updateProgressBar(step);
    var progress = document.getElementById("wizardProgress");
    if (progress) progress.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateProgressBar(step) {
    var fill = document.getElementById("wizardProgressFill");
    if (fill) fill.style.width = ((step - 1) / (TOTAL_STEPS - 1)) * 100 + "%";
    document.querySelectorAll(".wizard-progress__step").forEach(function (el) {
      var s = Number(el.getAttribute("data-step"));
      el.classList.toggle("is-active", s === step);
      el.classList.toggle("is-done", s < step);
    });
  }

  // -------- Fun 嘉推薦分頁:與 fun-jia.html 共用同一份行程資料與收藏機制 --------
  function bindFunJiaPanel(ns) {
    var sortSelect = document.getElementById("funJiaSortSelect");

    renderFunJiaList(ns, sortSelect.value);

    sortSelect.addEventListener("change", function () {
      renderFunJiaList(ns, sortSelect.value);
    });

    document.getElementById("funJiaItinList").addEventListener("click", function (e) {
      handleItinCardClick(ns, e, function () {
        renderFunJiaList(ns, sortSelect.value);
        renderMyFavItineraries(ns);
      });
    });
  }

  function renderFunJiaList(ns, sortMode) {
    ns.itineraryService.getItineraries().then(function (list) {
      var sorted =
        sortMode === "popularity"
          ? list.slice().sort(function (a, b) {
              return b.favoriteCount - a.favoriteCount;
            })
          : list;
      document.getElementById("funJiaItinList").innerHTML = sorted.map(renderFunJiaCard).join("");
    });
  }

  // -------- 我的收藏分頁:區分「收藏的行程」與「收藏的景點」(景點/店家/住宿)兩個子頁籤 --------
  function bindMyFavoritesPanel(ns) {
    bindMyFavSubTabs();
    renderMyFavItineraries(ns);
    renderMyFavPois(ns);

    // 委派事件:行程卡片(.fav-btn / .itin-card__create-btn)由本頁處理;景點/店家/住宿卡片(.poi-fav-btn)的收藏
    // 切換已由 poi-card-list.js 自身處理,這裡只需在收藏後重新整理清單。
    document.getElementById("myFavoritesPanel").addEventListener("click", function (e) {
      var handled = handleItinCardClick(ns, e, function () {
        renderMyFavItineraries(ns);
        renderFunJiaList(ns, document.getElementById("funJiaSortSelect").value);
      });
      if (handled) return;
      if (e.target.closest(".poi-fav-btn")) {
        renderMyFavPois(ns);
      }
    });
  }

  /** 行程卡片(Fun 嘉推薦 / 我的收藏共用):處理收藏愛心與「建立揪團」按鈕,回傳是否已處理該次點擊 */
  function handleItinCardClick(ns, e, afterFavoriteToggle) {
    var createBtn = e.target.closest(".itin-card__create-btn");
    if (createBtn) {
      e.preventDefault();
      var id = createBtn.getAttribute("data-id");
      ns.itineraryService.getItineraries().then(function (list) {
        var item = list.find(function (i) {
          return i.id === id;
        });
        if (item) createGroupFromItinerary(item);
      });
      return true;
    }
    var favBtn = e.target.closest(".fav-btn");
    if (favBtn) {
      e.preventDefault();
      ns.itineraryService.toggleFavorite(favBtn.getAttribute("data-id"));
      afterFavoriteToggle();
      return true;
    }
    return false;
  }

  function bindMyFavSubTabs() {
    var tabs = document.querySelectorAll("#myFavSubTabs .my-fav-tab");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) {
          t.classList.remove("is-active");
        });
        tab.classList.add("is-active");
        var view = tab.getAttribute("data-view");
        document.getElementById("myFavItinView").classList.toggle("is-active", view === "itineraries");
        document.getElementById("myFavPoiView").classList.toggle("is-active", view === "pois");
      });
    });
  }

  function renderMyFavItineraries(ns) {
    var itinListEl = document.getElementById("myFavItinList");
    ns.itineraryService.getItineraries().then(function (list) {
      var favoritedItins = list.filter(function (item) {
        return item.isFavorited;
      });
      itinListEl.innerHTML = favoritedItins.length
        ? favoritedItins.map(renderFunJiaCard).join("")
        : '<div class="empty-state"><i class="fa-regular fa-heart"></i><p>還沒有收藏任何行程,快去「Fun 嘉推薦」按愛心收藏吧!</p></div>';
    });
  }

  function renderMyFavPois(ns) {
    var poiListEl = document.getElementById("myFavPoiList");
    ns.poiFavoriteService.getFavoritedPois().then(function (favoritedPois) {
      if (!favoritedPois.length) {
        poiListEl.innerHTML =
          '<div class="empty-state"><i class="fa-regular fa-heart"></i><p>還沒有收藏任何景點、店家或住宿,快去「快選查詢」按愛心收藏吧!</p></div>';
        return;
      }
      poiListEl.innerHTML = "";
      ns.poiCardList.renderList(poiListEl, favoritedPois, "list");
    });
  }

  function renderFunJiaCard(item) {
    return (
      '<div class="itin-card card">' +
      '<div class="itin-card__top">' +
      window.FunJia.poiPlaceholder.render(item.image, "size-sm") +
      '<div class="itin-card__body">' +
      "<h3>" + escapeHtml(item.title) + "</h3>" +
      '<p class="summary">' + escapeHtml(item.summary) + "</p>" +
      '<div class="itin-card__meta">' +
      '<span><i class="fa-regular fa-calendar"></i> ' + item.days + " 天</span>" +
      '<button class="fav-btn' + (item.isFavorited ? " is-active" : "") + '" data-id="' + item.id + '">' +
      '<i class="fa-' + (item.isFavorited ? "solid" : "regular") + ' fa-heart"></i> ' + item.favoriteCount +
      "</button>" +
      '<span><i class="fa-regular fa-comment"></i> ' + item.comments.length + "</span>" +
      "</div>" +
      "</div>" +
      "</div>" +
      '<div class="itin-card__footer">' +
      '<a class="itin-card__link" href="itin-detail.html?id=' + item.id + '">' +
      "查看完整行程 <i class=\"fa-solid fa-chevron-right\"></i>" +
      "</a>" +
      '<button type="button" class="itin-card__create-btn" data-id="' + item.id + '">' +
      '<i class="fa-solid fa-people-group"></i> 建立揪團</button>' +
      "</div>" +
      "</div>"
    );
  }

  /** 帶著 Fun 嘉推薦行程的景點,切換到「建立揪團」分頁並帶入精靈 Step 1(免再手動選景點) */
  function createGroupFromItinerary(item) {
    itineraryStopsCache[item.id] = item.stops || [];
    itineraryDaysCache[item.id] = item.days || 1;
    itineraryTitleCache[item.id] = item.title;

    var createTab = document.querySelector('.group-tab[data-panel="createPanel"]');
    if (createTab) createTab.click();

    seedItineraryIntoWizard(item.id, item.title);
  }

  // -------- 帶入 Fun 嘉推薦行程:快取行程站點資料,供 ?itineraryId= 深連結與卡片「建立揪團」共用 --------
  var itineraryStopsCache = {};
  var itineraryDaysCache = {};
  var itineraryTitleCache = {};

  function loadItineraryCache(ns) {
    ns.itineraryService.getItineraries().then(function (list) {
      list.forEach(function (item) {
        itineraryStopsCache[item.id] = item.stops || [];
        itineraryDaysCache[item.id] = item.days || 1;
        itineraryTitleCache[item.id] = item.title;
      });
      prefillItineraryFromQuery();
    });
  }

  /** 從行程詳情頁點選「加入行程計畫」進入時(group-travel.html?itineraryId=...),自動帶入該行程的景點 */
  function prefillItineraryFromQuery() {
    var itineraryId = new URLSearchParams(window.location.search).get("itineraryId");
    if (!itineraryId || !itineraryStopsCache[itineraryId]) return;
    seedItineraryIntoWizard(itineraryId, itineraryTitleCache[itineraryId] || "");
  }

  /** 將 Fun 嘉推薦行程的景點帶入精靈,停留在 Step1 讓使用者確認/調整行程名稱與日期後再繼續 */
  function seedItineraryIntoWizard(itineraryId, title) {
    seedCustomStopsFromPreset(itineraryId, title);
    goToStep(1);

    var nameInput = document.getElementById("createName");
    if (!nameInput.value.trim()) nameInput.value = title || "";

    var hint = document.getElementById("createResult");
    hint.classList.add("is-visible");
    hint.innerHTML =
      '<p class="invite-block__deferred">已為您帶入「' +
      escapeHtml(title) +
      '」的景點,請確認行程名稱與日期,下一步可再調整景點與順序。</p>';

    nameInput.focus();
    var progress = document.getElementById("wizardProgress");
    if (progress) progress.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /** 將 Fun 嘉推薦行程的站點,轉換為可編輯的自訂地點清單,讓使用者能加入更多地點、調整住宿天數後重新計算動線 */
  function seedCustomStopsFromPreset(itineraryId, title) {
    var presetStops = itineraryStopsCache[itineraryId] || [];
    var days = itineraryDaysCache[itineraryId] || 1;
    var lodgingHints = [];

    state.customStops = presetStops
      .map(function (stop) {
        var lodgingMatch = /^(.*?)\(住宿\)\s*$/.exec(stop.name.trim());
        if (lodgingMatch) {
          lodgingHints.push(lodgingMatch[1].trim());
          return null; // 住宿改由系統依動線自動安排,不列入一般站點清單
        }

        var attraction = state.attractions.find(function (a) {
          return a.name === stop.name;
        });
        var customStop = { name: stop.name, note: stop.note || "" };
        if (attraction) {
          customStop.lat = attraction.lat;
          customStop.lng = attraction.lng;
          customStop.category = attraction.category;
          customStop.address = attraction.address;
          customStop.sourceId = attraction.id;
        } else {
          customStop.needsGeocode = true;
        }
        return customStop;
      })
      .filter(Boolean);

    state.plan = null;
    state.planAdopted = false;
    state.seedItineraryId = itineraryId;
    state.seedItineraryTitle = title;
    state.seedLodgingNote = lodgingHints.length
      ? "住宿(" + lodgingHints.join("、") + ")將由系統依動線自動安排。"
      : null;

    syncCustomStops();
    renderSpotSuggestions(document.getElementById("spotSearch").value.trim());
    seedTripLengthFromDays(days);

    resolvePresetStopCoordinates();
  }

  /** 依推薦行程原有天數,初始化「行程天數」切換按鈕(多日則同步帶入天數步進器) */
  function seedTripLengthFromDays(days) {
    var normalizedDays = Math.max(1, days || 1);
    state.tripLength = normalizedDays > 1 ? "multi" : "day";
    state.days = Math.min(7, Math.max(2, normalizedDays));
    setToggleValue("tripLengthToggle", "data-length", state.tripLength);
    document.getElementById("dayStepperField").style.display = state.tripLength === "multi" ? "flex" : "none";
    document.getElementById("dayCountInput").value = String(state.days);
  }

  /** 推薦行程中未能直接對應景點資料庫的站點,嘗試以地址服務定位取得座標,才能排入自動動線計算 */
  function resolvePresetStopCoordinates() {
    state.customStops
      .filter(function (s) {
        return s.needsGeocode;
      })
      .forEach(function (stop) {
        var baseNote = stop.note;
        stop.note = baseNote ? baseNote + "(定位中...)" : "定位中...";
        syncCustomStops();

        window.FunJia.geocodeService.geocode(stop.name + " 嘉義").then(function (result) {
          delete stop.needsGeocode;
          if (result) {
            stop.lat = result.lat;
            stop.lng = result.lng;
            stop.address = result.displayName;
            stop.note = baseNote;
          } else {
            stop.note = baseNote ? baseNote + "(未能定位,無法排入自動動線)" : "未能定位,無法排入自動動線";
          }
          syncCustomStops();
        });
      });
  }

  // -------- Step 2:探索與挑選景點 --------
  function loadSpotSuggestions(ns) {
    ns.poiService.getList("attractions").then(function (list) {
      state.attractions = list;
      renderSpotTagRow();
      renderSpotSuggestions("");
    });

    document.getElementById("spotSearch").addEventListener("input", function (e) {
      renderSpotSuggestions(e.target.value.trim());
    });
  }

  /** 推薦標籤:依景點資料中的分類(自然風景、文化園區...)產生快速篩選按鈕 */
  function renderSpotTagRow() {
    var seen = {};
    var categories = [];
    state.attractions.forEach(function (item) {
      if (item.category && !seen[item.category]) {
        seen[item.category] = true;
        categories.push(item.category);
      }
    });

    var container = document.getElementById("spotTagRow");
    container.innerHTML = categories
      .map(function (cat) {
        return '<button type="button" class="spot-tag" data-tag="' + escapeHtml(cat) + '">' + escapeHtml(cat) + "</button>";
      })
      .join("");

    container.querySelectorAll(".spot-tag").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tag = btn.getAttribute("data-tag");
        var input = document.getElementById("spotSearch");
        var next = input.value.trim() === tag ? "" : tag;
        input.value = next;
        renderSpotSuggestions(next);
      });
    });
  }

  function updateActiveTagHighlight(keyword) {
    document.querySelectorAll("#spotTagRow .spot-tag").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-tag") === keyword);
    });
  }

  /** 未輸入關鍵字時顯示「熱門景點」大卡片方便快速加入;有輸入關鍵字/點選標籤時顯示精簡篩選清單 */
  function renderSpotSuggestions(keyword) {
    var container = document.getElementById("spotSuggestions");
    var pool = state.attractions;

    updateActiveTagHighlight(keyword);

    if (!keyword) {
      var hot = pool.filter(function (item) {
        return item.isHot;
      });
      if (!hot.length) {
        container.innerHTML = "";
        return;
      }
      container.innerHTML =
        '<p class="field-hint" style="margin-top: 0">熱門景點,點擊快速加入</p>' +
        '<div class="spot-cards">' +
        hot.map(buildSpotCardHTML).join("") +
        "</div>";
      container.querySelectorAll(".spot-card").forEach(function (card) {
        card.addEventListener("click", function () {
          toggleCustomStopBySpot(findAttractionById(card.getAttribute("data-spot-id")));
        });
      });
      return;
    }

    var lower = keyword.toLowerCase();
    var matches = pool.filter(function (item) {
      return (
        item.name.toLowerCase().indexOf(lower) !== -1 ||
        (item.category || "").toLowerCase().indexOf(lower) !== -1 ||
        (item.tags || []).some(function (tag) {
          return tag.toLowerCase().indexOf(lower) !== -1;
        })
      );
    });

    if (!matches.length) {
      container.innerHTML = '<p class="field-hint">找不到符合的地點,試試手動輸入。</p>';
      return;
    }

    container.innerHTML = matches.slice(0, 12).map(buildSpotChipHTML).join("");
    container.querySelectorAll(".spot-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        toggleCustomStopBySpot(findAttractionById(chip.getAttribute("data-spot-id")));
      });
    });
  }

  function findAttractionById(id) {
    return state.attractions.find(function (a) {
      return a.id === id;
    });
  }

  function buildSpotCardHTML(item) {
    var added = isSpotAdded(item.id);
    return (
      '<div class="spot-card' +
      (added ? " is-added" : "") +
      '" data-spot-id="' +
      item.id +
      '">' +
      window.FunJia.poiPlaceholder.render(item.image, "size-sm", item.photo) +
      '<div class="spot-card__body"><strong>' +
      escapeHtml(item.name) +
      "</strong><span>" +
      escapeHtml(item.category || "") +
      "</span></div>" +
      '<button type="button" class="spot-card__add" aria-label="' +
      (added ? "移除" : "加入") +
      '"><i class="fa-solid ' +
      (added ? "fa-check" : "fa-plus") +
      '"></i></button>' +
      "</div>"
    );
  }

  function buildSpotChipHTML(item) {
    var added = isSpotAdded(item.id);
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
  }

  function isSpotAdded(id) {
    return state.customStops.some(function (s) {
      return s.sourceId === id;
    });
  }

  function toggleCustomStopBySpot(item) {
    if (!item) return;
    var existingIndex = state.customStops.findIndex(function (s) {
      return s.sourceId === item.id;
    });
    if (existingIndex !== -1) {
      state.customStops.splice(existingIndex, 1);
    } else {
      state.customStops.push({
        name: item.name,
        note: item.category || "",
        sourceId: item.id,
        lat: item.lat,
        lng: item.lng,
        category: item.category,
        address: item.address,
      });
    }
    state.plan = null;
    state.planAdopted = false;
    syncCustomStops();
    renderSpotSuggestions(document.getElementById("spotSearch").value.trim());
  }

  function bindManualAddToggle() {
    document.getElementById("toggleManualAddBtn").addEventListener("click", function () {
      var row = document.getElementById("customStopAddRow");
      var isOpen = row.style.display !== "none";
      row.style.display = isOpen ? "none" : "flex";
      if (!isOpen) document.getElementById("customStopInput").focus();
    });
  }

  function bindCustomStopControls() {
    document.getElementById("addCustomStopBtn").addEventListener("click", function () {
      var input = document.getElementById("customStopInput");
      var btn = document.getElementById("addCustomStopBtn");
      var name = input.value.trim();
      if (!name) return;

      var stop = { name: name, note: "手動新增(定位中...)" };
      state.customStops.push(stop);
      state.plan = null;
      state.planAdopted = false;
      input.value = "";
      syncCustomStops();

      if (!window.FunJia.geocodeService) return;
      btn.disabled = true;
      window.FunJia.geocodeService
        .geocode(name)
        .then(function (result) {
          if (result) {
            stop.lat = result.lat;
            stop.lng = result.lng;
            stop.address = result.displayName;
            stop.note = "已定位";
          } else {
            stop.note = "手動新增(未能定位,無法排入自動動線)";
          }
        })
        .finally(function () {
          btn.disabled = false;
          syncCustomStops();
        });
    });

    document.getElementById("customStopsList").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-remove-index]");
      if (!btn) return;
      removeCustomStopAt(Number(btn.getAttribute("data-remove-index")));
    });
  }

  function removeCustomStopAt(index) {
    var removed = state.customStops.splice(index, 1)[0];
    state.plan = null;
    state.planAdopted = false;
    syncCustomStops();
    if (removed && removed.sourceId) {
      renderSpotSuggestions(document.getElementById("spotSearch").value.trim());
    }
  }

  // -------- 常駐的「已選景點」狀態列(Step 2 底部) --------
  function bindSelectedStopsBar() {
    document.getElementById("selectedStopsToggleBtn").addEventListener("click", function () {
      document.getElementById("selectedStopsBar").classList.toggle("is-expanded");
    });
    document.getElementById("selectedStopsPreview").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-remove-selected-index]");
      if (!btn) return;
      removeCustomStopAt(Number(btn.getAttribute("data-remove-selected-index")));
    });
  }

  function renderSelectedStopsBar() {
    var count = state.customStops.length;
    var bar = document.getElementById("selectedStopsBar");
    var label = document.getElementById("selectedStopsCountLabel");
    var cta = document.getElementById("toStep3Btn");
    var preview = document.getElementById("selectedStopsPreview");

    bar.classList.toggle("is-empty", count === 0);
    if (!count) bar.classList.remove("is-expanded");
    label.textContent = count ? "已選 " + count + " 個景點" : "尚未選擇任何景點";
    cta.disabled = count === 0;
    cta.innerHTML = count
      ? "下一步:規劃動線(已選 " + count + " 景點) <i class=\"fa-solid fa-arrow-right\"></i>"
      : "請先選擇至少 1 個景點";

    preview.innerHTML = state.customStops
      .map(function (stop, index) {
        return (
          '<span class="selected-stop-chip">' +
          escapeHtml(stop.name) +
          '<button type="button" class="selected-stop-chip__remove" data-remove-selected-index="' +
          index +
          '" aria-label="移除"><i class="fa-solid fa-xmark"></i></button></span>'
        );
      })
      .join("");
  }

  function bindRouteOptions() {
    bindToggle("tripLengthToggle", "length", function (value) {
      state.tripLength = value;
      state.plan = null;
      state.planAdopted = false;
      document.getElementById("dayStepperField").style.display = value === "multi" ? "flex" : "none";
    });

    bindToggle("strategyToggle", "strategy", function (value) {
      state.strategy = value;
      state.plan = null;
      state.planAdopted = false;
    });

    document.getElementById("dayCountInput").addEventListener("change", function (e) {
      var value = Math.min(7, Math.max(2, parseInt(e.target.value, 10) || 2));
      e.target.value = value;
      state.days = value;
      state.plan = null;
      state.planAdopted = false;
    });

    document.getElementById("computeRouteBtn").addEventListener("click", function () {
      var btn = this;
      var original = btn.innerHTML;
      var hint = document.getElementById("routeComputeHint");
      btn.disabled = true;
      hint.textContent = "";
      hint.classList.remove("is-error");
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 正在為你規劃最佳動線...';

      minDelay(computeRoute(), 500).then(function (res) {
        btn.disabled = false;
        btn.innerHTML = original;
        if (res.error) {
          hint.textContent = res.error;
          hint.classList.add("is-error");
          return;
        }
        goToStep(4);
      });
    });

    document.getElementById("skipComputeBtn").addEventListener("click", function () {
      goToStep(4);
    });
  }

  /** 通用的「按鈕群組切換」綁定(行程天數 / 交通策略共用,做法與智慧減碳排程頁一致) */
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

  function setToggleValue(containerId, attr, value) {
    document.querySelectorAll("#" + containerId + " .mode-btn").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute(attr) === value);
    });
  }

  /** 純計算最佳動線(不直接操作 DOM),回傳 {plan} 或 {error},由呼叫端決定如何呈現載入態與轉場 */
  function computeRoute() {
    var ns = window.FunJia;
    var placeable = state.customStops.filter(function (s) {
      return typeof s.lat === "number" && typeof s.lng === "number";
    });

    if (placeable.length < 2) {
      return Promise.resolve({
        error: "至少需要 2 個已定位的地點,才能計算最佳動線。你也可以先不計算,直接前往下一步。",
      });
    }

    return ns.itineraryPlannerService
      .planItinerary({
        points: placeable,
        tripLength: state.tripLength,
        days: state.days,
        strategy: state.strategy,
      })
      .then(function (plan) {
        if (!plan) {
          return { error: "無法計算動線,請確認地點資訊。" };
        }
        state.plan = plan;
        state.planAdopted = false;
        reorderCustomStopsFromPlan(plan);
        return { plan: plan };
      });
  }

  /** 確保載入態至少顯示一段時間,避免計算太快時畫面一閃而過,削弱「系統正在運算」的感受 */
  function minDelay(promise, ms) {
    return Promise.all([
      promise,
      new Promise(function (resolve) {
        setTimeout(resolve, ms);
      }),
    ]).then(function (results) {
      return results[0];
    });
  }

  /** 建立前先「採用」計算出的動線,依減碳量核發減碳點數(與智慧減碳排程頁共用同一套錢包機制) */
  function buildAdoptBlockHTML(plan) {
    var disabledAttr = state.planAdopted ? " disabled" : "";
    var label = state.planAdopted ? "已採用此行程" : "採用此行程,獲得 " + plan.pointsEarned + " 點";
    return (
      '<button type="button" class="btn btn-primary plan-adopt-btn" id="routeAdoptBtn"' + disabledAttr + ">" +
      '<i class="fa-solid fa-check"></i> ' + label + "</button>" +
      '<div class="plan-adopt-result' + (state.planAdopted ? " is-visible" : "") + '" id="routeAdoptResult"></div>'
    );
  }

  function bindAdoptButton(plan) {
    var btn = document.getElementById("routeAdoptBtn");
    if (!btn || state.planAdopted) return;
    btn.addEventListener("click", function () {
      if (state.planAdopted) return;
      var savedKg = (plan.carbonSavedG / 1000).toFixed(1);
      window.FunJia.walletService.addPoints(plan.pointsEarned, "揪團行程採用低碳動線建議(減碳 " + savedKg + " kg)");
      state.planAdopted = true;
      btn.setAttribute("disabled", "disabled");
      btn.innerHTML = '<i class="fa-solid fa-check"></i> 已採用此行程';
      var resultEl = document.getElementById("routeAdoptResult");
      resultEl.classList.add("is-visible");
      resultEl.innerHTML =
        "已獲得 <strong>" + plan.pointsEarned + " 點</strong> 減碳點數!前往 <a href=\"carbon-wallet.html\">減碳錢包</a> 查看。";
    });
  }

  /** 依計算出的最佳動線,重新排序畫面上的自訂地點清單(未被排入動線的地點維持在最後) */
  function reorderCustomStopsFromPlan(plan) {
    var orderedNames = [];
    plan.days.forEach(function (day) {
      day.items.forEach(function (it) {
        if (it.kind === "attraction") orderedNames.push(it.poi.name);
      });
    });

    var byName = {};
    state.customStops.forEach(function (s) {
      (byName[s.name] = byName[s.name] || []).push(s);
    });
    var reordered = [];
    orderedNames.forEach(function (name) {
      if (byName[name] && byName[name].length) reordered.push(byName[name].shift());
    });
    state.customStops.forEach(function (s) {
      if (reordered.indexOf(s) === -1) reordered.push(s);
    });
    state.customStops = reordered;
    syncCustomStops();
  }

  function formatClock(minutesSinceMidnight) {
    var h = Math.floor(minutesSinceMidnight / 60) % 24;
    var m = minutesSinceMidnight % 60;
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  }

  /**
   * 將 itineraryPlannerService 產出的動線結果,轉換為可讀的摘要卡片 + 分日時間軸
   * (與智慧減碳排程頁(itinerary-planner-page.js)共用同一套呈現方式,建立時預覽 / 我的旅遊計畫卡片皆適用)
   */
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
          plan.unplaced.map(function (p) { return escapeHtml(p.name); }).join("、") +
          "</p>"
        : "";

    var summaryHTML =
      '<div class="card plan-summary">' +
      '<div class="plan-summary__tile"><strong>' + plan.days.length + " 天</strong><span>" + lengthLabel + "</span></div>" +
      '<div class="plan-summary__tile"><strong>' + plan.totalDistanceKm.toFixed(1) + " 公里</strong><span>總移動距離</span></div>" +
      '<div class="plan-summary__tile"><strong>' + hours + " 時 " + minutes + " 分</strong><span>總行程時間</span></div>" +
      '<div class="plan-summary__saved"><i class="fa-solid fa-leaf"></i> 相較全程自駕減碳 ' + savedKg + " kg(本行程碳排約 " + totalKg + " kg),可獲得 " + plan.pointsEarned + " 點減碳點數</div>" +
      unplacedHtml +
      "</div>";

    var daysHTML = plan.days
      .map(function (day, index) {
        var itemsHTML = day.items.map(buildPlanItemHTML).join("");
        return (
          '<div class="card day-block"><div class="day-block__header">第 ' + (index + 1) + " 天</div>" +
          '<div class="day-block__items">' + itemsHTML + "</div></div>"
        );
      })
      .join("");

    return summaryHTML + daysHTML;
  }

  function buildPlanItemHTML(item) {
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

  function renderCustomStopsList() {
    var container = document.getElementById("customStopsList");
    var hint = document.getElementById("customStopsHint");

    if (!state.customStops.length) {
      container.innerHTML = "";
      hint.textContent = "尚未加入任何地點,請回到上一步挑選景點。";
      hint.classList.remove("is-error");
      return;
    }

    hint.textContent =
      "已加入 " +
      state.customStops.length +
      " 個地點,可拖曳左側把手調整順序。" +
      (state.seedLodgingNote ? " " + state.seedLodgingNote : "");
    hint.classList.remove("is-error");

    container.innerHTML = state.customStops
      .map(function (stop, index) {
        return (
          '<div class="custom-stop-item"><span class="custom-stop-item__handle" aria-hidden="true">' +
          '<i class="fa-solid fa-grip-vertical"></i></span><span class="custom-stop-item__order">' +
          (index + 1) +
          '</span><div class="custom-stop-item__body"><strong>' +
          escapeHtml(stop.name) +
          "</strong>" +
          (stop.note ? "<span>" + escapeHtml(stop.note) + "</span>" : "") +
          "</div>" +
          '<button type="button" class="custom-stop-item__remove" data-remove-index="' +
          index +
          '" aria-label="移除"><i class="fa-solid fa-xmark"></i></button></div>'
        );
      })
      .join("");
  }

  /** Step2(挑選景點)與 Step3(排序清單)皆會因新增/移除地點而變動,統一同步兩處畫面 */
  function syncCustomStops() {
    renderCustomStopsList();
    renderSelectedStopsBar();
  }

  /** Step3「排序與偏好設定」清單改以拖曳把手排序(取代原本的上下按鈕) */
  function initStopsSortable() {
    var container = document.getElementById("customStopsList");
    if (!window.Sortable || !container) return;
    window.Sortable.create(container, {
      handle: ".custom-stop-item__handle",
      animation: 150,
      ghostClass: "is-dragging",
      forceFallback: true, // 統一在桌機/行動裝置以滑鼠事件模擬拖曳,避免瀏覽器原生 HTML5 DnD 的樣式與相容性差異
      onEnd: function (evt) {
        if (evt.oldIndex === evt.newIndex) return;
        var moved = state.customStops.splice(evt.oldIndex, 1)[0];
        state.customStops.splice(evt.newIndex, 0, moved);
        state.plan = null;
        state.planAdopted = false;
        container.querySelectorAll(".custom-stop-item").forEach(function (el, i) {
          el.querySelector(".custom-stop-item__order").textContent = i + 1;
          el.querySelector("[data-remove-index]").setAttribute("data-remove-index", i);
        });
      },
    });
  }

  /** Step4 進場時,依是否已計算動線顯示「建議動線」或目前排序的「已排定行程」清單 */
  function renderStep4Preview() {
    var hint = document.getElementById("routePlanHint");
    var result = document.getElementById("routePlanResult");

    if (state.plan) {
      hint.textContent =
        state.plan.unplaced && state.plan.unplaced.length
          ? "已排除 " + state.plan.unplaced.length + " 個未定位的地點,建立後仍可調整。"
          : "已為您規劃出建議動線,建立揪團後仍可再次調整。";
      hint.classList.remove("is-error");
      result.innerHTML = buildPlanResultHTML(state.plan, state.tripLength) + buildAdoptBlockHTML(state.plan);
      bindAdoptButton(state.plan);
    } else {
      hint.textContent = "以下為目前排序的地點清單,建立揪團後仍可調整動線。";
      hint.classList.remove("is-error");
      result.innerHTML = buildScheduledStopsHTML(state.customStops);
    }
  }

  function resetWizard() {
    state.customStops = [];
    state.plan = null;
    state.planAdopted = false;
    state.tripLength = "day";
    state.days = 2;
    state.strategy = "balanced";
    state.seedItineraryId = null;
    state.seedItineraryTitle = null;
    state.seedLodgingNote = null;

    syncCustomStops();
    renderSpotSuggestions("");
    document.getElementById("spotSearch").value = "";
    document.getElementById("customStopAddRow").style.display = "none";
    document.getElementById("selectedStopsBar").classList.remove("is-expanded");
    setToggleValue("tripLengthToggle", "data-length", "day");
    document.getElementById("dayStepperField").style.display = "none";
    document.getElementById("dayCountInput").value = "2";
    setToggleValue("strategyToggle", "data-strategy", "balanced");
    document.getElementById("routeComputeHint").textContent = "";
    document.getElementById("routeComputeHint").classList.remove("is-error");
    document.getElementById("routePlanHint").textContent = "";
    document.getElementById("routePlanResult").innerHTML = "";
    goToStep(1);
  }

  // -------- 建立結果:分享 / 邀請好友 --------
  function renderCreateResult(group, inviteEnabled) {
    var resultEl = document.getElementById("createResult");
    resultEl.classList.add("is-visible");
    resultEl.innerHTML =
      "揪團「" +
      escapeHtml(group.name) +
      "」建立成功!" +
      (inviteEnabled ? buildInviteBlock(group) : buildDeferredInviteBlock(group)) +
      (group.plan
        ? buildPlanResultHTML(group.plan, group.tripLength || "day")
        : buildScheduledStopsHTML(group.stops));

    var enableBtn = resultEl.querySelector('[data-action="enable-invite-inline"]');
    if (enableBtn) {
      enableBtn.addEventListener("click", function () {
        window.FunJia.groupService.enableInvite(group.code);
        renderCreateResult(group, true);
        renderMyGroups(window.FunJia);
      });
    }
    bindShareButtons(resultEl, group);
  }

  /** 建立揪團後,若未計算最佳動線,顯示目前排序的已排定站點清單 */
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

  function buildInviteBlock(group) {
    return (
      '<div class="invite-block">' +
      '<p class="invite-block__label">分享代碼給朋友加入</p>' +
      '<span class="code">' +
      group.code +
      "</span>" +
      '<div class="share-actions">' +
      '<button type="button" class="btn btn-accent btn-sm" data-action="share-fb" data-code="' +
      group.code +
      '" data-name="' +
      escapeHtml(group.name) +
      '"><i class="fa-brands fa-facebook"></i> 分享到 Facebook</button>' +
      '<button type="button" class="btn btn-outline btn-sm" data-action="copy-link" data-code="' +
      group.code +
      '"><i class="fa-solid fa-link"></i> 複製邀請連結</button>' +
      "</div></div>"
    );
  }

  function buildDeferredInviteBlock(group) {
    return (
      '<p class="invite-block__deferred">行程已為你保留代碼 <strong>' +
      group.code +
      '</strong>,之後隨時可以邀請好友。</p>' +
      '<button type="button" class="btn btn-outline btn-sm" data-action="enable-invite-inline">' +
      '<i class="fa-solid fa-user-plus"></i> 現在就邀請好友</button>'
    );
  }

  function bindShareButtons(scopeEl, group) {
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
  }

  function buildInviteUrl(code) {
    return window.location.origin + window.location.pathname + "?code=" + encodeURIComponent(code);
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

  // -------- 我的揪團:清單 --------
  function renderMyGroups(ns) {
    var groups = ns.groupService.getMyGroups();
    var container = document.getElementById("myGroupsList");
    if (!groups.length) {
      container.innerHTML =
        '<div class="empty-state"><i class="fa-regular fa-face-smile"></i><p>還沒有揪團,快去建立或加入一個吧!</p></div>';
      return;
    }
    container.innerHTML = groups.map(renderGroupCard).join("");
  }

  function renderGroupCard(g) {
    var stopsHtml = "";
    if (g.stops && g.stops.length) {
      stopsHtml =
        '<div class="my-group-card__stops">' +
        g.stops
          .slice(0, 4)
          .map(function (s) {
            return '<span class="tag">' + escapeHtml(s.name) + "</span>";
          })
          .join("") +
        (g.stops.length > 4 ? '<span class="tag">+' + (g.stops.length - 4) + "</span>" : "") +
        "</div>";
    }

    var isOwner = window.FunJia.groupService.isOwner(g.code);
    var badgesHtml =
      '<div class="my-group-card__badges">' +
      '<span class="tag' + (isOwner ? "" : " tag-accent") + '">' + (isOwner ? "我建立的" : "我加入的") + "</span>" +
      (g.itineraryTitle ? '<span class="tag"><i class="fa-solid fa-route"></i> ' + escapeHtml(g.itineraryTitle) + "</span>" : "") +
      "</div>";

    var planSummaryHtml = "";
    if (g.plan && g.plan.days) {
      var savedKg = (g.plan.carbonSavedG / 1000).toFixed(1);
      planSummaryHtml =
        '<p><i class="fa-solid fa-leaf"></i> ' +
        g.plan.days.length +
        " 天行程・預估減碳 " +
        savedKg +
        " kg</p>";
    }

    return (
      '<a class="card my-group-card" href="itinerary-plan.html?code=' +
      encodeURIComponent(g.code) +
      '">' +
      '<div class="my-group-card__title-row"><strong>' +
      escapeHtml(g.name) +
      '</strong><span class="my-group-card__code">' +
      g.code +
      "</span></div>" +
      '<p><i class="fa-regular fa-calendar"></i> ' +
      (g.date || "尚未指定日期") +
      "</p>" +
      '<p><i class="fa-solid fa-users"></i> 成員(' +
      g.members.length +
      "):" +
      escapeHtml(g.members.join("、")) +
      "</p>" +
      planSummaryHtml +
      badgesHtml +
      stopsHtml +
      '<div class="my-group-card__footer"><span>查看行程計畫</span><i class="fa-solid fa-chevron-right"></i></div>' +
      "</a>"
    );
  }

  // -------- 共用小工具 --------
  function prefillNickname() {
    var nickname = readNickname();
    if (!nickname) return;
    document.getElementById("createNickname").value = nickname;
    document.getElementById("joinNickname").value = nickname;
  }

  function readNickname() {
    return localStorage.getItem(NICKNAME_KEY) || "";
  }

  function saveNickname(nickname) {
    if (nickname) localStorage.setItem(NICKNAME_KEY, nickname);
  }

  function prefillJoinCodeFromQuery() {
    var params = new URLSearchParams(window.location.search);
    var code = params.get("code");
    if (!code) return;
    document.getElementById("joinCode").value = code.toUpperCase();
    document.getElementById("joinForm").classList.add("is-open");
    document.querySelector('.group-tab[data-panel="myPlansPanel"]').click();
  }

  /** 支援從外部連結(如首頁節點)直接開啟「我的旅遊計畫」分頁,例如 group-travel.html?tab=myPlans */
  function openTabFromQuery() {
    var params = new URLSearchParams(window.location.search);
    if (params.get("tab") !== "myPlans") return;
    var tab = document.querySelector('.group-tab[data-panel="myPlansPanel"]');
    if (tab) tab.click();
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
})();
