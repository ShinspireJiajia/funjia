/**
 * landmark-action-sheet.js
 * 地標動作選單:點擊地標卡片後由下方彈出,提供 Google 地圖導航、
 * Apple 地圖導航、複製地址資訊等選項。可被任何頁面共用。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var sheetEl = null;
  var toastTimer = null;
  var current = null;

  function ensureSheet() {
    if (sheetEl) {
      return sheetEl;
    }
    sheetEl = document.createElement("div");
    sheetEl.className = "landmark-sheet";
    sheetEl.innerHTML =
      '<div class="landmark-sheet__backdrop" data-action="cancel"></div>' +
      '<div class="landmark-sheet__panel" role="dialog" aria-modal="true">' +
      '<div class="landmark-sheet__header">' +
      '<i class="fa-solid fa-location-dot"></i>' +
      '<div><strong class="landmark-sheet__name"></strong><p class="landmark-sheet__address"></p></div>' +
      "</div>" +
      '<button type="button" class="landmark-sheet__option" data-action="google">' +
      '<i class="fa-brands fa-google"></i> Google 地圖導航</button>' +
      '<button type="button" class="landmark-sheet__option" data-action="apple">' +
      '<i class="fa-brands fa-apple"></i> Apple 地圖導航</button>' +
      '<button type="button" class="landmark-sheet__option" data-action="copy">' +
      '<i class="fa-regular fa-copy"></i> 複製地址資訊</button>' +
      '<button type="button" class="landmark-sheet__cancel" data-action="cancel">取消</button>' +
      "</div>" +
      '<div class="landmark-sheet__toast"></div>';
    document.body.appendChild(sheetEl);

    sheetEl.addEventListener("click", function (event) {
      var action = event.target.closest("[data-action]");
      if (!action) {
        return;
      }
      handleAction(action.dataset.action);
    });

    return sheetEl;
  }

  function open(landmark) {
    current = landmark;
    var el = ensureSheet();
    el.querySelector(".landmark-sheet__name").textContent = landmark.name;
    el.querySelector(".landmark-sheet__address").textContent = landmark.address;
    el.classList.add("is-open");
  }

  function close() {
    if (sheetEl) {
      sheetEl.classList.remove("is-open");
    }
  }

  function handleAction(action) {
    if (action === "cancel") {
      close();
      return;
    }
    if (!current) {
      return;
    }
    if (action === "google") {
      window.open(
        "https://www.google.com/maps/dir/?api=1&destination=" + current.lat + "," + current.lng,
        "_blank",
        "noopener"
      );
      close();
    } else if (action === "apple") {
      window.open(
        "https://maps.apple.com/?daddr=" + current.lat + "," + current.lng + "&dirflg=d",
        "_blank",
        "noopener"
      );
      close();
    } else if (action === "copy") {
      copyAddress(current.address);
    }
  }

  function copyAddress(address) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(address).then(
        function () {
          finishCopy(true);
        },
        function () {
          finishCopy(false);
        }
      );
      return;
    }
    var textarea = document.createElement("textarea");
    textarea.value = address;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(textarea);
    finishCopy(ok);
  }

  function finishCopy(ok) {
    close();
    showToast(ok ? "已複製地址資訊" : "複製失敗,請手動複製");
  }

  function showToast(message) {
    var el = ensureSheet();
    var toastEl = el.querySelector(".landmark-sheet__toast");
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("is-visible");
    }, 2200);
  }

  ns.landmarkActionSheet = {
    open: open,
  };
})(window.FunJia);
