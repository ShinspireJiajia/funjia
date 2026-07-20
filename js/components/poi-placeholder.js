/**
 * poi-placeholder.js
 * Demo 階段尚無真實景點/店家照片素材,以「圖示 + 主題色漸層」取代照片顯示。
 * 未來若取得實際照片,只需將對應 image 欄位改為圖片路徑,
 * 並改用 <img> 標籤即可,不需更動資料結構的欄位名稱。
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

  var IMAGE_MAP = {
    mountain: { icon: "fa-mountain-sun", tone: "green" },
    cabin: { icon: "fa-house-chimney", tone: "brown" },
    landmark: { icon: "fa-monument", tone: "teal" },
    harbor: { icon: "fa-water", tone: "blue" },
    train: { icon: "fa-train", tone: "brown" },
    forest: { icon: "fa-tree", tone: "green" },
    skywalk: { icon: "fa-mountain", tone: "green" },
    wetland: { icon: "fa-water", tone: "teal" },
    reservoir: { icon: "fa-water", tone: "blue" },
    museum: { icon: "fa-landmark-dome", tone: "teal" },
    temple: { icon: "fa-place-of-worship", tone: "orange" },
    farm: { icon: "fa-seedling", tone: "green" },
    factory: { icon: "fa-industry", tone: "brown" },
    chapel: { icon: "fa-church", tone: "pink" },
    "food-rice": { icon: "fa-bowl-rice", tone: "orange" },
    tea: { icon: "fa-mug-hot", tone: "green" },
    "food-market": { icon: "fa-utensils", tone: "orange" },
    "food-box": { icon: "fa-box", tone: "brown" },
    "food-oyster": { icon: "fa-fish", tone: "blue" },
    "hotel-mountain": { icon: "fa-bed", tone: "green" },
    "hotel-city": { icon: "fa-building", tone: "gray" },
    "hotel-sea": { icon: "fa-umbrella-beach", tone: "blue" },
    sakura: { icon: "fa-seedling", tone: "pink" },
    music: { icon: "fa-music", tone: "teal" },
    birds: { icon: "fa-dove", tone: "blue" },
    parking: { icon: "fa-square-parking", tone: "gray" },
    "parking-transfer": { icon: "fa-square-parking", tone: "green" },
    "bus-stop": { icon: "fa-bus", tone: "orange" },
    "bike-station": { icon: "fa-bicycle", tone: "green" },
    "news-train": { icon: "fa-train", tone: "brown" },
    "news-parking": { icon: "fa-square-parking", tone: "gray" },
    "news-eco": { icon: "fa-leaf", tone: "green" },
    "news-event": { icon: "fa-calendar-days", tone: "teal" },
  };

  /**
   * 產生佔位圖 HTML;若 photoUrl 有值(assets/ 內的實際照片),則改顯示照片。
   * @param {string} imageKey 對應 IMAGE_MAP 的 key
   * @param {string} extraClass 額外的 CSS class(控制尺寸)
   * @param {string} [photoUrl] 實際照片路徑(相對於 pages/ 目錄)
   */
  function renderPlaceholder(imageKey, extraClass, photoUrl) {
    var cls = "poi-placeholder" + (extraClass ? " " + extraClass : "");
    if (photoUrl) {
      return (
        '<div class="' + cls + ' poi-placeholder--photo">' +
        '<img src="' + photoUrl + '" alt="" loading="lazy" />' +
        "</div>"
      );
    }
    var entry = IMAGE_MAP[imageKey] || { icon: "fa-image", tone: "gray" };
    var gradient = GRADIENTS[entry.tone] || GRADIENTS.gray;
    return (
      '<div class="' + cls + '" style="background:' + gradient + '">' +
      '<i class="fa-solid ' + entry.icon + '"></i>' +
      "</div>"
    );
  }

  ns.poiPlaceholder = {
    render: renderPlaceholder,
  };
})(window.FunJia);
