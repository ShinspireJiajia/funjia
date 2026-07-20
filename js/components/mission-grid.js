/**
 * mission-grid.js
 * 任務系統格線元件(pages/deals.html「任務」頁籤):依探索/文化/低碳分類篩選任務卡片,
 * 點擊卡片開啟詳情卡,依任務驗證方式(GPS/QR Code/問答/拍照/運輸回報)完成任務並發放獎勵。
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

  var CATEGORY_LABELS = { explore: "探索任務", culture: "文化任務", lowcarbon: "低碳任務" };
  var CATEGORY_TAGS = { explore: "探索", culture: "文化", lowcarbon: "低碳" };
  var VERIFY_LABELS = {
    gps: "GPS 定位打卡",
    qrcode: "掃描 QR Code",
    quiz: "現地問答",
    photo: "拍照上傳",
    transit: "運輸紀錄回報",
  };
  var VERIFY_ICONS = {
    gps: "fa-location-crosshairs",
    qrcode: "fa-qrcode",
    quiz: "fa-circle-question",
    photo: "fa-camera",
    transit: "fa-bus",
  };
  var FAIL_MESSAGE = {
    too_far: function (detail) {
      return "距離目標地點還有約 " + Math.max(0, Math.round(detail.distance - detail.radius)) + " 公尺,請靠近後再試一次";
    },
    permission: function () {
      return "請允許瀏覽器定位權限後再試一次";
    },
    unsupported: function () {
      return "此瀏覽器不支援定位功能,請改用其他裝置打卡";
    },
    wrong_code: function () {
      return "代碼不正確,請確認後再輸入一次";
    },
    wrong_answer: function () {
      return "答案有誤,請重新作答";
    },
    no_photo: function () {
      return "請先選擇一張照片";
    },
    not_confirmed: function () {
      return "請先勾選確認再送出";
    },
  };

  var gridContainer = null;
  var sheetEl = null;
  var currentMission = null;
  var allMissions = [];
  var activeCategory = "all";
  var toastTimer = null;

  function gradientOf(item) {
    return GRADIENTS[item.tone] || GRADIENTS.gray;
  }

  function formatDate(dateStr) {
    return dateStr ? dateStr.replace(/-/g, "/") : "";
  }

  function buildFilterHTML() {
    var cats = [{ key: "all", label: "全部" }].concat(
      Object.keys(CATEGORY_LABELS).map(function (key) {
        return { key: key, label: CATEGORY_TAGS[key] };
      })
    );
    return (
      '<div class="mission-filter">' +
      cats
        .map(function (cat) {
          return (
            '<button type="button" class="mission-filter__chip' +
            (cat.key === activeCategory ? " is-active" : "") +
            '" data-category="' +
            cat.key +
            '">' +
            cat.label +
            "</button>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function buildRewardText(mission) {
    var parts = ["+" + mission.reward.points + " 減碳點數"];
    if (mission.reward.badgeTitle) {
      parts.push("徽章「" + mission.reward.badgeTitle + "」");
    }
    return parts.join(" · ");
  }

  function buildCardHTML(mission) {
    var statusClass = mission.isDone ? " is-done" : mission.isActive ? "" : " is-inactive";
    return (
      '<button type="button" class="mission-card' + statusClass + '" data-id="' + mission.id + '">' +
      '<div class="mission-card__icon" style="background:' + gradientOf(mission) + '"><i class="fa-solid ' + mission.icon + '"></i></div>' +
      '<div class="mission-card__body">' +
      '<span class="tag mission-card__cat">' + CATEGORY_TAGS[mission.category] + "</span>" +
      "<h3>" + mission.title + "</h3>" +
      '<p class="mission-card__desc">' + mission.desc + "</p>" +
      '<p class="mission-card__meta"><i class="fa-solid ' + VERIFY_ICONS[mission.verifyMethod] + '"></i> ' +
      VERIFY_LABELS[mission.verifyMethod] +
      ' <span class="mission-card__reward"><i class="fa-solid fa-leaf"></i> ' + buildRewardText(mission) + "</span></p>" +
      (mission.isDone
        ? '<p class="mission-card__status is-done"><i class="fa-solid fa-check"></i> 已完成 · ' + formatDate(mission.doneAt) + "</p>"
        : mission.isActive
        ? ""
        : '<p class="mission-card__status is-inactive"><i class="fa-solid fa-clock"></i> 任務期間:' +
          formatDate(mission.startDate) + " – " + formatDate(mission.endDate) + "</p>") +
      "</div>" +
      "</button>"
    );
  }

  function renderList() {
    var filtered = activeCategory === "all" ? allMissions : allMissions.filter(function (m) { return m.category === activeCategory; });
    var listEl = gridContainer.querySelector(".mission-list");
    if (!filtered.length) {
      listEl.innerHTML = '<div class="empty-state"><i class="fa-regular fa-face-frown"></i><p>此分類目前尚無任務</p></div>';
      return;
    }
    listEl.innerHTML = filtered.map(buildCardHTML).join("");
  }

  function render(container, missions) {
    gridContainer = container;
    allMissions = missions || [];
    if (!allMissions.length) {
      container.innerHTML = '<div class="empty-state"><i class="fa-regular fa-face-frown"></i><p>目前尚無任務</p></div>';
      return;
    }
    container.innerHTML = buildFilterHTML() + '<div class="mission-list"></div>';
    renderList();
  }

  function refresh() {
    if (!gridContainer) {
      return;
    }
    ns.missionService.getMissionsWithStatus().then(function (missions) {
      render(gridContainer, missions);
    });
  }

  function buildVerifyBodyHTML(mission) {
    if (mission.verifyMethod === "qrcode") {
      return (
        '<p class="mission-sheet__hint">' + mission.verifyConfig.hint + "</p>" +
        '<input type="text" class="mission-sheet__input" id="missionCodeInput" placeholder="輸入任務代碼" />'
      );
    }
    if (mission.verifyMethod === "quiz") {
      return mission.verifyConfig.questions
        .map(function (question, qIndex) {
          return (
            '<div class="mission-quiz" data-q-index="' + qIndex + '">' +
            '<p class="mission-quiz__q">' + (qIndex + 1) + ". " + question.q + "</p>" +
            question.options
              .map(function (option, oIndex) {
                return (
                  '<label class="mission-quiz__option">' +
                  '<input type="radio" name="mission-q-' + qIndex + '" value="' + oIndex + '" /> ' +
                  option +
                  "</label>"
                );
              })
              .join("") +
            "</div>"
          );
        })
        .join("");
    }
    if (mission.verifyMethod === "photo") {
      return (
        '<p class="mission-sheet__hint">' + mission.verifyConfig.hint + "</p>" +
        '<input type="file" accept="image/*" class="mission-sheet__input" id="missionPhotoInput" />'
      );
    }
    if (mission.verifyMethod === "transit") {
      return (
        '<p class="mission-sheet__hint">' + mission.verifyConfig.hint + "</p>" +
        '<label class="mission-quiz__option"><input type="checkbox" id="missionTransitConfirm" /> 我確認已搭乘公共運輸/森林鐵路抵達目的地</label>'
      );
    }
    return '<p class="mission-sheet__hint">請在目標地點附近點擊下方按鈕完成 GPS 定位打卡</p>';
  }

  function ensureSheet() {
    if (sheetEl) {
      return sheetEl;
    }
    sheetEl = document.createElement("div");
    sheetEl.className = "mission-sheet";
    sheetEl.innerHTML =
      '<div class="mission-sheet__backdrop" data-action="cancel"></div>' +
      '<div class="mission-sheet__panel" role="dialog" aria-modal="true">' +
      '<button type="button" class="mission-sheet__close" data-action="cancel" aria-label="關閉"><i class="fa-solid fa-xmark"></i></button>' +
      '<span class="mission-sheet__icon"></span>' +
      '<span class="tag mission-sheet__cat"></span>' +
      '<h3 class="mission-sheet__title"></h3>' +
      '<p class="mission-sheet__desc"></p>' +
      '<p class="mission-sheet__status"></p>' +
      '<div class="mission-sheet__verify"></div>' +
      '<p class="mission-sheet__message"></p>' +
      '<p class="mission-sheet__reward"></p>' +
      '<button type="button" class="btn btn-primary mission-sheet__action" data-action="primary"></button>' +
      "</div>" +
      '<div class="mission-sheet__toast"></div>';
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
    currentMission = null;
  }

  function setSheetMessage(text, tone) {
    var el = sheetEl.querySelector(".mission-sheet__message");
    el.textContent = text || "";
    el.className = "mission-sheet__message" + (tone ? " is-" + tone : "");
  }

  function populateSheet(mission) {
    var el = ensureSheet();
    el.querySelector(".mission-sheet__icon").style.background = gradientOf(mission);
    el.querySelector(".mission-sheet__icon").innerHTML = '<i class="fa-solid ' + mission.icon + '"></i>';
    el.querySelector(".mission-sheet__cat").textContent = CATEGORY_LABELS[mission.category];
    el.querySelector(".mission-sheet__title").textContent = mission.title;
    el.querySelector(".mission-sheet__desc").textContent = mission.desc;
    el.querySelector(".mission-sheet__status").textContent = mission.isDone
      ? "已完成 · " + mission.doneAt
      : mission.isActive
      ? "尚未完成 · " + VERIFY_LABELS[mission.verifyMethod]
      : "任務期間:" + formatDate(mission.startDate) + " – " + formatDate(mission.endDate);
    el.querySelector(".mission-sheet__verify").innerHTML = mission.isDone ? "" : buildVerifyBodyHTML(mission);
    el.querySelector(".mission-sheet__reward").innerHTML =
      '<i class="fa-solid fa-leaf"></i> 完成可獲得 ' + buildRewardText(mission) + (mission.reward.note ? "<br />" + mission.reward.note : "");
    setSheetMessage("");

    var actionBtn = el.querySelector(".mission-sheet__action");
    actionBtn.disabled = !mission.isActive && !mission.isDone;
    if (mission.isDone) {
      actionBtn.style.display = mission.type ? "" : "none";
      actionBtn.innerHTML = '<i class="fa-solid fa-map-location-dot"></i> 查看相關頁面';
    } else if (!mission.isActive) {
      actionBtn.style.display = "";
      actionBtn.innerHTML = "任務尚未開放";
    } else {
      actionBtn.style.display = "";
      actionBtn.innerHTML = '<i class="fa-solid ' + VERIFY_ICONS[mission.verifyMethod] + '"></i> 完成任務';
    }
  }

  function openDetail(missionId) {
    var mission = allMissions.find(function (m) { return m.id === missionId; });
    if (!mission) {
      return;
    }
    currentMission = mission;
    var el = ensureSheet();
    populateSheet(mission);
    el.classList.add("is-open");
  }

  function handlePrimaryAction() {
    if (!currentMission) {
      return;
    }
    if (currentMission.isDone) {
      if (currentMission.type) {
        window.location.href = "detail.html?type=" + currentMission.type + "&id=" + currentMission.refId;
      }
      return;
    }
    if (!currentMission.isActive) {
      return;
    }
    runVerification(currentMission);
  }

  function runVerification(mission) {
    var el = ensureSheet();
    var actionBtn = el.querySelector(".mission-sheet__action");
    setSheetMessage("");

    if (mission.verifyMethod === "gps") {
      actionBtn.disabled = true;
      actionBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 定位中…';
      ns.missionService
        .verifyGps(mission)
        .then(function () {
          onVerified(mission);
        })
        .catch(function (err) {
          onVerifyFailed(mission, err);
        });
      return;
    }

    if (mission.verifyMethod === "qrcode") {
      var code = el.querySelector("#missionCodeInput").value;
      ns.missionService
        .verifyQrcode(mission, code)
        .then(function () {
          onVerified(mission);
        })
        .catch(function (err) {
          onVerifyFailed(mission, err);
        });
      return;
    }

    if (mission.verifyMethod === "quiz") {
      var answers = mission.verifyConfig.questions.map(function (question, qIndex) {
        var checked = el.querySelector('input[name="mission-q-' + qIndex + '"]:checked');
        return checked ? parseInt(checked.value, 10) : -1;
      });
      ns.missionService
        .verifyQuiz(mission, answers)
        .then(function () {
          onVerified(mission);
        })
        .catch(function (err) {
          onVerifyFailed(mission, err);
        });
      return;
    }

    if (mission.verifyMethod === "photo") {
      var fileInput = el.querySelector("#missionPhotoInput");
      ns.missionService
        .verifyPhoto(mission, fileInput.files && fileInput.files.length > 0)
        .then(function () {
          onVerified(mission);
        })
        .catch(function (err) {
          onVerifyFailed(mission, err);
        });
      return;
    }

    if (mission.verifyMethod === "transit") {
      var confirmed = el.querySelector("#missionTransitConfirm").checked;
      ns.missionService
        .verifyTransit(mission, confirmed)
        .then(function () {
          onVerified(mission);
        })
        .catch(function (err) {
          onVerifyFailed(mission, err);
        });
    }
  }

  function onVerified(mission) {
    ns.missionService.complete(mission);
    showToast("🎉 任務完成:" + mission.title + "(+" + mission.reward.points + " 減碳點數)");
    closeSheet();
    refresh();
  }

  function onVerifyFailed(mission, err) {
    var el = ensureSheet();
    var actionBtn = el.querySelector(".mission-sheet__action");
    var messageFn = FAIL_MESSAGE[err.reason] || function () { return "驗證失敗,請稍後再試"; };
    setSheetMessage(messageFn(err), "error");
    actionBtn.disabled = false;
    actionBtn.innerHTML = '<i class="fa-solid ' + VERIFY_ICONS[mission.verifyMethod] + '"></i> 再試一次';
  }

  function showToast(message) {
    var el = ensureSheet();
    var toastEl = el.querySelector(".mission-sheet__toast");
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("is-visible");
    }, 2600);
  }

  function init(container) {
    container.addEventListener("click", function (event) {
      var chip = event.target.closest(".mission-filter__chip");
      if (chip) {
        activeCategory = chip.dataset.category;
        container.querySelectorAll(".mission-filter__chip").forEach(function (el) {
          el.classList.toggle("is-active", el === chip);
        });
        renderList();
        return;
      }
      var card = event.target.closest(".mission-card");
      if (card) {
        openDetail(card.dataset.id);
      }
    });
  }

  ns.missionGrid = {
    render: render,
    init: init,
  };
})(window.FunJia);
