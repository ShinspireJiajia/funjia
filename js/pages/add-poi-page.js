/**
 * add-poi-page.js
 * 新增資料頁(pages/add-poi.html)邏輯:依網址 ?type= 決定新增景點/店家/住宿/活動,
 * 使用者自行填寫資料(選填地址時自動定位)並送出,demo 階段儲存於 localStorage
 * (透過 userPoiService),送出後會併入「快選查詢」對應分類的清單一起顯示。
 */

(function () {
  "use strict";

  var PHOTO_MAX_DIMENSION = 640;
  var PHOTO_QUALITY = 0.7;
  var pendingPhoto = "";

  // 各類型的分類選項、文案固定由系統定義,對應現有資料採用的分類,避免使用者自行輸入不一致的分類名稱
  var TYPE_CONFIG = {
    attractions: {
      label: "景點",
      intro: "找不到喜歡的私房景點嗎?歡迎自行建立,和大家分享嘉義的美好角落!",
      namePlaceholder: "例如:獨立山步道",
      descPlaceholder: "介紹這個景點的特色、怎麼去、注意事項...",
      categories: ["自然風景", "文化園區", "地標景點", "海濱景點", "鐵道文化", "生態園區", "水庫風景", "其他"],
      showPriceRange: false,
      showDateRange: false,
    },
    shops: {
      label: "店家",
      intro: "找不到喜歡的私房美食或店家嗎?歡迎自行建立,和大家分享嘉義的好味道!",
      namePlaceholder: "例如:阿明號小吃店",
      descPlaceholder: "介紹這間店的特色、招牌餐點、注意事項...",
      categories: ["美食", "夜市小吃", "咖啡廳", "茶葉伴手禮", "其他"],
      showPriceRange: false,
      showDateRange: false,
    },
    lodging: {
      label: "住宿",
      intro: "找不到喜歡的私房住宿嗎?歡迎自行建立,和大家分享嘉義的好去處!",
      namePlaceholder: "例如:老街日光民宿",
      descPlaceholder: "介紹這個住宿的特色、房型、周邊環境...",
      categories: ["山區旅館", "市區飯店", "海濱民宿", "民宿", "其他"],
      showPriceRange: true,
      showDateRange: false,
    },
    events: {
      label: "活動",
      intro: "有你知道但榜上沒有的在地活動嗎?歡迎自行建立,和大家分享嘉義的精彩活動!",
      namePlaceholder: "例如:蘭潭音樂會",
      descPlaceholder: "介紹這個活動的特色、活動內容、注意事項...",
      categories: ["季節活動", "藝文活動", "生態活動", "市集活動", "其他"],
      showPriceRange: false,
      showDateRange: true,
    },
  };

  var currentType = "attractions";
  var currentConfig = TYPE_CONFIG.attractions;

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;
    var params = new URLSearchParams(window.location.search);
    var typeParam = params.get("type");
    currentType =
      typeParam && ns.poiService.USER_ADDABLE_TYPES.indexOf(typeParam) !== -1 ? typeParam : "attractions";
    currentConfig = TYPE_CONFIG[currentType];

    applyTypeConfig(currentConfig);
    fillCategoryOptions(currentConfig);
    renderA11yTagsChecklist(ns);
    bindPhotoInput();
    renderMyPoiList(ns);

    document.getElementById("addPoiForm").addEventListener("submit", function (e) {
      e.preventDefault();
      handleSubmit(ns);
    });

    document.getElementById("myPoiList").addEventListener("click", function (e) {
      var btn = e.target.closest('[data-action="delete-poi"]');
      if (!btn) return;
      var name = btn.getAttribute("data-name");
      var confirmed = window.confirm("確定要刪除「" + name + "」這筆資料嗎?此動作無法復原。");
      if (!confirmed) return;
      ns.userPoiService.remove(btn.getAttribute("data-id"));
      renderMyPoiList(ns);
    });
  });

  function applyTypeConfig(config) {
    document.title = "新增" + config.label + "｜Fun 嘉";
    document.getElementById("pageHeading").textContent = "新增" + config.label;
    document.getElementById("addPoiIntro").innerHTML = '<i class="fa-solid fa-map-pin"></i> ' + config.intro;
    document.getElementById("poiNameLabel").textContent = config.label + "名稱 *";
    document.getElementById("poiName").placeholder = config.namePlaceholder;
    document.getElementById("poiDescriptionLabel").textContent = config.label + "介紹 *";
    document.getElementById("poiDescription").placeholder = config.descPlaceholder;
    document.getElementById("myListTitle").textContent = "我新增的" + config.label;
    document.getElementById("submitBtnLabel").textContent = "送出" + config.label;
    document.getElementById("priceRangeField").hidden = !config.showPriceRange;
    document.getElementById("dateRangeField").hidden = !config.showDateRange;
    document.getElementById("poiHoursLabel").textContent = config.showDateRange ? "當天開放時間" : "營業/開放時間";
  }

  /** 依無障礙 / 分眾標籤字典(js/core/a11y-tags.js)渲染勾選清單,語言切換時就地重繪標籤名稱 */
  function renderA11yTagsChecklist(ns) {
    var container = document.getElementById("poiA11yTags");
    if (!container || !ns.a11yTags) return;
    var checkedCodes = getCheckedA11yCodes(container);
    container.innerHTML = ns.a11yTags.CODES.map(function (code) {
      var def = ns.a11yTags.get(code);
      var checked = checkedCodes.indexOf(code) !== -1 ? " checked" : "";
      return (
        '<label class="a11y-tags-checklist__item">' +
        '<input type="checkbox" value="' + code + '"' + checked + " />" +
        '<i class="fa-solid ' + def.icon + '"></i> ' + ns.a11yTags.label(code) +
        "</label>"
      );
    }).join("");
  }

  function getCheckedA11yCodes(container) {
    if (!container) return [];
    return Array.prototype.map.call(
      container.querySelectorAll("input[type=checkbox]:checked"),
      function (input) {
        return input.value;
      }
    );
  }

  document.addEventListener("funjia:lang-changed", function () {
    renderA11yTagsChecklist(window.FunJia);
  });

  function fillCategoryOptions(config) {
    var select = document.getElementById("poiCategory");
    select.insertAdjacentHTML(
      "beforeend",
      config.categories
        .map(function (cat) {
          return '<option value="' + escapeHtml(cat) + '">' + escapeHtml(cat) + "</option>";
        })
        .join("")
    );
  }

  function bindPhotoInput() {
    document.getElementById("poiPhoto").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      compressImage(file, PHOTO_MAX_DIMENSION, PHOTO_QUALITY).then(function (dataUrl) {
        pendingPhoto = dataUrl;
        renderPhotoPreview();
      });
    });
  }

  function renderPhotoPreview() {
    var container = document.getElementById("photoPreview");
    if (!pendingPhoto) {
      container.innerHTML = "";
      return;
    }
    container.innerHTML =
      '<div class="photo-preview__thumb"><img src="' + pendingPhoto + '" alt="照片預覽" />' +
      '<button type="button" class="photo-preview__remove" id="removePhotoBtn" aria-label="移除照片">' +
      '<i class="fa-solid fa-xmark"></i></button></div>';
    document.getElementById("removePhotoBtn").addEventListener("click", function () {
      pendingPhoto = "";
      document.getElementById("poiPhoto").value = "";
      renderPhotoPreview();
    });
  }

  function handleSubmit(ns) {
    var name = document.getElementById("poiName").value.trim();
    var category = document.getElementById("poiCategory").value.trim();
    var address = document.getElementById("poiAddress").value.trim();
    var hours = document.getElementById("poiHours").value.trim();
    var phone = document.getElementById("poiPhone").value.trim();
    var priceRange = document.getElementById("poiPriceRange").value.trim();
    var startDate = document.getElementById("poiStartDate").value;
    var endDate = document.getElementById("poiEndDate").value;
    var description = document.getElementById("poiDescription").value.trim();
    var tags = document
      .getElementById("poiTags")
      .value.split(",")
      .map(function (t) {
        return t.trim();
      })
      .filter(Boolean);
    var a11yTags = getCheckedA11yCodes(document.getElementById("poiA11yTags"));

    if (!name || !description) return;

    var submitBtn = document.getElementById("submitPoiBtn");
    var hint = document.getElementById("geocodeHint");
    submitBtn.disabled = true;

    var geocodePromise =
      address && ns.geocodeService ? ns.geocodeService.geocode(address) : Promise.resolve(null);

    if (address) {
      hint.textContent = "正在為地址定位...";
      hint.classList.remove("is-error");
    }

    geocodePromise
      .then(function (result) {
        var data = {
          name: name,
          category: category,
          address: address,
          hours: hours,
          phone: phone,
          tags: tags,
          description: description,
          photo: pendingPhoto,
        };
        if (a11yTags.length) {
          data.a11yTags = a11yTags;
        }
        if (currentConfig.showPriceRange && priceRange) {
          data.priceRange = priceRange;
        }
        if (currentConfig.showDateRange) {
          data.startDate = startDate;
          data.endDate = endDate;
        }
        if (result) {
          data.lat = result.lat;
          data.lng = result.lng;
          hint.textContent = "已完成定位。";
        } else if (address) {
          hint.textContent = "未能定位此地址,資料仍會建立,但暫不會顯示於地圖模式。";
        } else {
          hint.textContent = "";
        }

        var item = ns.userPoiService.add(currentType, data);
        showSuccess(item);
        resetForm();
        renderMyPoiList(ns);
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
  }

  function showSuccess(item) {
    var resultEl = document.getElementById("addResult");
    resultEl.classList.add("is-visible");
    resultEl.innerHTML =
      '<i class="fa-solid fa-circle-check"></i> ' +
      currentConfig.label +
      "「" +
      escapeHtml(item.name) +
      "」新增成功,已出現在「快選查詢」的" +
      currentConfig.label +
      '清單中!' +
      '<a class="add-poi-result__link" href="detail.html?type=' +
      item.type +
      "&id=" +
      item.id +
      '">查看詳情 <i class="fa-solid fa-arrow-right"></i></a>';
  }

  function resetForm() {
    document.getElementById("addPoiForm").reset();
    pendingPhoto = "";
    renderPhotoPreview();
  }

  function renderMyPoiList(ns) {
    var container = document.getElementById("myPoiList");
    var list = ns.userPoiService.getAll(currentType);
    if (!list.length) {
      container.innerHTML =
        '<div class="empty-state"><i class="fa-regular fa-face-smile"></i><p>還沒有新增任何' +
        currentConfig.label +
        ',快來建立第一筆吧!</p></div>';
      return;
    }
    container.innerHTML = list.map(buildMyPoiCard).join("");
  }

  function buildMyPoiCard(item) {
    var placeholder = window.FunJia.poiPlaceholder.render(item.image, "size-sm", item.photo);
    return (
      '<div class="card my-poi-card">' +
      '<a class="my-poi-card__link" href="detail.html?type=' + item.type + "&id=" + item.id + '">' +
      placeholder +
      '<div class="my-poi-card__body">' +
      "<strong>" + escapeHtml(item.name) + "</strong>" +
      '<span class="my-poi-card__meta">' + escapeHtml(item.category || "") + "</span>" +
      "</div></a>" +
      '<button type="button" class="my-poi-card__delete" data-action="delete-poi" data-id="' +
      item.id +
      '" data-name="' + escapeHtml(item.name) + '" aria-label="刪除">' +
      '<i class="fa-solid fa-trash"></i></button>' +
      "</div>"
    );
  }

  function compressImage(file, maxDimension, quality) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
          var canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          var ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
})();
