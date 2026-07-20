/**
 * i18n-core.js
 * 全站共用(masterpage + 各功能頁)多語系字典與套用邏輯(中/英/日/韓)。
 * 與 js/assistant/i18n.js 共用同一組 localStorage 鍵(funjia_lang),
 * 但涵蓋範圍為導覽列、頁首標題、無障礙設定面板等全站共用文字,
 * AI 語音助理頁面的對話文案則仍由其專屬字典負責。
 *
 * 使用方式:於元素加上 data-i18n="鍵值" 會替換 textContent;
 * 若需替換屬性(如 aria-label),另加 data-i18n-attr="aria-label"。
 * 語言變更時會透過 postMessage 廣播給 iframe 內外的頁面即時重新套用,
 * 不需整頁重新載入即可保留頁面捲動與狀態。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var STORAGE_KEY = "funjia_lang";

  var DICT = {
    "zh-TW": {
      navHome: "首頁",
      navDiscover: "發現",
      navAssistant: "嘉義幫",
      navWallet: "減碳錢包",
      navMore: "更多功能",
      fabGroupTravelAria: "快速進入揪團旅行",
      langBtnAria: "語言與無障礙設定",
      langBtnLabel: "設定",
      panelLangTitle: "語言",
      panelFontTitle: "字級大小",
      panelContrastTitle: "高對比模式",
      fontLevel0: "標準",
      fontLevel1: "大",
      fontLevel2: "特大",
      fontLevel3: "最大",
      contrastOn: "開啟",
      contrastOff: "關閉",
      "pageTitle.carbonWallet": "減碳錢包",
      "pageTitle.funJia": "Fun 嘉・推薦行程",
      "pageTitle.groupTravel": "揪團旅行",
      "pageTitle.itineraryPlanner": "智慧減碳排程",
      "pageTitle.itineraryPlan": "旅遊計畫",
      "pageTitle.more": "更多功能",
      "pageTitle.rewardsMall": "優惠商城",
      moreLinksTitle: "相關連結",
      moreSystemTitle: "系統",
      a11ySectionTitle: "無障礙與顯示設定",
      a11ySectionDesc: "調整字級、對比與語言,打造更適合每個人的瀏覽體驗",
      a11yTagsHeading: "無障礙 / 分眾標籤",
      a11yTagsHint: "勾選符合的項目,協助更多使用者判斷是否適合前往",
    },
    en: {
      navHome: "Home",
      navDiscover: "Discover",
      navAssistant: "Assistant",
      navWallet: "Carbon Wallet",
      navMore: "More",
      fabGroupTravelAria: "Quick access to Group Travel",
      langBtnAria: "Language & Accessibility Settings",
      langBtnLabel: "Settings",
      panelLangTitle: "Language",
      panelFontTitle: "Font Size",
      panelContrastTitle: "High Contrast Mode",
      fontLevel0: "Standard",
      fontLevel1: "Large",
      fontLevel2: "X-Large",
      fontLevel3: "XX-Large",
      contrastOn: "On",
      contrastOff: "Off",
      "pageTitle.carbonWallet": "Carbon Wallet",
      "pageTitle.funJia": "Fun Jia Picks",
      "pageTitle.groupTravel": "Group Travel",
      "pageTitle.itineraryPlanner": "Smart Low-Carbon Planner",
      "pageTitle.itineraryPlan": "Travel Plan",
      "pageTitle.more": "More",
      "pageTitle.rewardsMall": "Rewards Mall",
      moreLinksTitle: "Related Links",
      moreSystemTitle: "System",
      a11ySectionTitle: "Accessibility & Display Settings",
      a11ySectionDesc: "Adjust font size, contrast, and language for a more comfortable experience",
      a11yTagsHeading: "Accessibility / Audience Tags",
      a11yTagsHint: "Check any that apply, to help other visitors know if this fits their needs",
    },
    ja: {
      navHome: "ホーム",
      navDiscover: "発見",
      navAssistant: "アシスタント",
      navWallet: "カーボンウォレット",
      navMore: "その他",
      fabGroupTravelAria: "「グループ旅行」へすぐに移動",
      langBtnAria: "言語とアクセシビリティの設定",
      langBtnLabel: "設定",
      panelLangTitle: "言語",
      panelFontTitle: "文字サイズ",
      panelContrastTitle: "ハイコントラストモード",
      fontLevel0: "標準",
      fontLevel1: "大",
      fontLevel2: "特大",
      fontLevel3: "最大",
      contrastOn: "オン",
      contrastOff: "オフ",
      "pageTitle.carbonWallet": "カーボンウォレット",
      "pageTitle.funJia": "Fun 嘉・おすすめ旅程",
      "pageTitle.groupTravel": "グループ旅行",
      "pageTitle.itineraryPlanner": "スマート低炭素プラン",
      "pageTitle.itineraryPlan": "旅行プラン",
      "pageTitle.more": "その他",
      "pageTitle.rewardsMall": "優待モール",
      moreLinksTitle: "関連リンク",
      moreSystemTitle: "システム",
      a11ySectionTitle: "アクセシビリティと表示設定",
      a11ySectionDesc: "文字サイズ・コントラスト・言語を調整して、より快適にご利用いただけます",
      a11yTagsHeading: "アクセシビリティ / 対象者タグ",
      a11yTagsHint: "該当する項目にチェックすると、他の利用者が行きやすさを判断する参考になります",
    },
    ko: {
      navHome: "홈",
      navDiscover: "발견",
      navAssistant: "어시스턴트",
      navWallet: "탄소 지갑",
      navMore: "더보기",
      fabGroupTravelAria: "그룹 여행으로 빠르게 이동",
      langBtnAria: "언어 및 접근성 설정",
      langBtnLabel: "설정",
      panelLangTitle: "언어",
      panelFontTitle: "글자 크기",
      panelContrastTitle: "고대비 모드",
      fontLevel0: "표준",
      fontLevel1: "크게",
      fontLevel2: "매우 크게",
      fontLevel3: "최대",
      contrastOn: "켜짐",
      contrastOff: "꺼짐",
      "pageTitle.carbonWallet": "탄소 지갑",
      "pageTitle.funJia": "Fun 嘉 추천 일정",
      "pageTitle.groupTravel": "그룹 여행",
      "pageTitle.itineraryPlanner": "스마트 저탄소 일정",
      "pageTitle.itineraryPlan": "여행 계획",
      "pageTitle.more": "더보기",
      "pageTitle.rewardsMall": "혜택 몰",
      moreLinksTitle: "관련 링크",
      moreSystemTitle: "시스템",
      a11ySectionTitle: "접근성 및 화면 설정",
      a11ySectionDesc: "글자 크기, 대비, 언어를 조정하여 더 편안하게 이용해 보세요",
      a11yTagsHeading: "접근성 / 대상별 태그",
      a11yTagsHint: "해당하는 항목을 선택하면 다른 이용자가 적합 여부를 판단하는 데 도움이 됩니다",
    },
  };

  function getCurrentLang() {
    var lang = localStorage.getItem(STORAGE_KEY);
    return DICT[lang] ? lang : "zh-TW";
  }

  function t(key) {
    var lang = getCurrentLang();
    return (DICT[lang] && DICT[lang][key]) || DICT["zh-TW"][key] || key;
  }

  function applyDom(root) {
    (root || document).querySelectorAll("[data-i18n]").forEach(function (el) {
      var text = t(el.getAttribute("data-i18n"));
      var attr = el.getAttribute("data-i18n-attr");
      if (attr) {
        el.setAttribute(attr, text);
      } else {
        el.textContent = text;
      }
    });
  }

  function broadcast() {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ source: "funjia", type: "lang-changed" }, "*");
      }
      document.querySelectorAll("iframe").forEach(function (frame) {
        if (frame.contentWindow) {
          frame.contentWindow.postMessage({ source: "funjia", type: "lang-changed" }, "*");
        }
      });
    } catch (e) {
      /* 跨視窗訊息在極少數瀏覽器安全性設定下可能被拒絕,忽略即可,不影響當前頁面套用 */
    }
  }

  function setLanguage(lang) {
    localStorage.setItem(STORAGE_KEY, DICT[lang] ? lang : "zh-TW");
    applyDom(document);
    document.dispatchEvent(new CustomEvent("funjia:lang-changed", { detail: { lang: getCurrentLang() } }));
    broadcast();
  }

  window.addEventListener("message", function (event) {
    var data = event.data;
    if (data && data.source === "funjia" && data.type === "lang-changed") {
      applyDom(document);
      document.dispatchEvent(new CustomEvent("funjia:lang-changed", { detail: { lang: getCurrentLang() } }));
    }
  });

  document.addEventListener("DOMContentLoaded", function () {
    applyDom(document);
  });

  ns.i18nCore = {
    LANGS: Object.keys(DICT),
    getCurrentLang: getCurrentLang,
    t: t,
    setLanguage: setLanguage,
    applyDom: applyDom,
  };
})(window.FunJia);
