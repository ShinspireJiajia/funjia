/**
 * a11y-tags.js
 * 無障礙 / 分眾標籤字典:定義景點等資料可標註的無障礙設施與分眾友善程度,
 * 圖示與顏色屬於展示層設定,標籤名稱依目前語言(funjia_lang)顯示對應翻譯。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var TAXONOMY = {
    wheelchairAccess: {
      icon: "fa-wheelchair",
      color: "#2f6b3d",
      label: {
        "zh-TW": "無障礙通道",
        en: "Wheelchair Accessible",
        ja: "バリアフリー通路",
        ko: "휠체어 접근로",
      },
    },
    accessibleRestroom: {
      icon: "fa-restroom",
      color: "#3d7ea6",
      label: {
        "zh-TW": "無障礙廁所",
        en: "Accessible Restroom",
        ja: "バリアフリートイレ",
        ko: "장애인 화장실",
      },
    },
    elderlyFriendly: {
      icon: "fa-person-cane",
      color: "#3d5140",
      label: {
        "zh-TW": "長者友善",
        en: "Senior-Friendly",
        ja: "高齢者にやさしい",
        ko: "고령자 친화",
      },
    },
    familyFriendly: {
      icon: "fa-child-reaching",
      color: "#c0392b",
      label: {
        "zh-TW": "親子友善",
        en: "Family-Friendly",
        ja: "親子にやさしい",
        ko: "가족 친화",
      },
    },
  };

  function getCurrentLang() {
    return ns.i18nCore ? ns.i18nCore.getCurrentLang() : "zh-TW";
  }

  function get(code) {
    return TAXONOMY[code] || null;
  }

  function label(code, lang) {
    var def = TAXONOMY[code];
    if (!def) return code;
    lang = lang || getCurrentLang();
    return def.label[lang] || def.label["zh-TW"];
  }

  ns.a11yTags = {
    TAXONOMY: TAXONOMY,
    CODES: Object.keys(TAXONOMY),
    get: get,
    label: label,
  };
})(window.FunJia);
