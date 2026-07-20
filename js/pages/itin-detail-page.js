/**
 * itin-detail-page.js
 * 推薦行程詳情頁(pages/itin-detail.html)邏輯:依 ?id= 讀取單一推薦行程,
 * 呈現完整停靠站規劃與留言,並支援收藏、留言互動(demo 以 localStorage 模擬)。
 */

(function () {
  "use strict";

  var MAX_COMMENT_PHOTOS = 2;
  var pendingPhotos = [];

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;
    var id = new URLSearchParams(window.location.search).get("id");

    load(ns, id);

    document.getElementById("itinFavBtn").addEventListener("click", function () {
      ns.itineraryService.toggleFavorite(id);
      load(ns, id);
    });

    document.getElementById("itinCommentSubmit").addEventListener("click", function () {
      var nickname = document.getElementById("itinNickname").value.trim();
      var text = document.getElementById("itinCommentText").value.trim();
      if (!text) return;
      ns.itineraryService.addComment(id, nickname, text, pendingPhotos);
      document.getElementById("itinNickname").value = "";
      document.getElementById("itinCommentText").value = "";
      pendingPhotos = [];
      renderPhotoPreview();
      load(ns, id);
    });

    document.getElementById("itinCommentPhotoInput").addEventListener("change", function (e) {
      handlePhotoSelection(e.target.files);
      e.target.value = "";
    });

    document.getElementById("itinCommentPhotoPreview").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-remove-photo-index]");
      if (!btn) return;
      pendingPhotos.splice(Number(btn.getAttribute("data-remove-photo-index")), 1);
      renderPhotoPreview();
    });
  });

  function handlePhotoSelection(fileList) {
    var files = Array.prototype.filter.call(fileList, function (f) {
      return f.type.indexOf("image/") === 0;
    });
    var slots = MAX_COMMENT_PHOTOS - pendingPhotos.length;
    if (slots <= 0) {
      renderPhotoPreview("已達 " + MAX_COMMENT_PHOTOS + " 張上限");
      return;
    }
    var accepted = files.slice(0, slots);
    var overflow = files.length > accepted.length;

    Promise.all(accepted.map(readAndResizeImage)).then(function (dataUrls) {
      var failed = dataUrls.filter(function (url) { return !url; }).length;
      pendingPhotos = pendingPhotos.concat(dataUrls.filter(Boolean));
      var hint = overflow
        ? "最多可上傳 " + MAX_COMMENT_PHOTOS + " 張,已為您加入前 " + accepted.length + " 張"
        : failed
        ? "有 " + failed + " 張照片無法讀取,請換一張試試"
        : "";
      renderPhotoPreview(hint);
    });
  }

  function readAndResizeImage(file) {
    var MAX_DIMENSION = 800;
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
          var canvas = document.createElement("canvas");
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.75));
        };
        img.onerror = function () {
          resolve(null);
        };
        img.src = reader.result;
      };
      reader.onerror = function () {
        resolve(null);
      };
      reader.readAsDataURL(file);
    });
  }

  function renderPhotoPreview(hint) {
    var el = document.getElementById("itinCommentPhotoPreview");
    var thumbs = pendingPhotos
      .map(function (src, i) {
        return (
          '<div class="comment-photo-preview__item"><img src="' + src + '" alt="" />' +
          '<button type="button" class="comment-photo-preview__remove" data-remove-photo-index="' + i + '" aria-label="移除照片">' +
          '<i class="fa-solid fa-xmark"></i></button></div>'
        );
      })
      .join("");
    var hintHtml = hint ? '<span class="comment-photo-hint">' + escapeHtml(hint) + "</span>" : "";
    el.innerHTML = thumbs + hintHtml;
  }

  function load(ns, id) {
    ns.itineraryService.getItineraryById(id).then(function (item) {
      if (!item) {
        document.querySelector(".detail-body").innerHTML =
          '<div class="empty-state"><i class="fa-regular fa-face-frown"></i><p>找不到這個行程</p></div>';
        return;
      }
      render(ns, item);
    });
  }

  function render(ns, item) {
    document.title = item.title + "｜Fun 嘉";

    var hero = document.getElementById("detailHero");
    var existingImage = hero.querySelector(".poi-placeholder");
    if (existingImage) existingImage.remove();
    hero.insertAdjacentHTML("afterbegin", ns.poiPlaceholder.render(item.image, "size-lg"));

    document.getElementById("itinName").textContent = item.title;

    var favBtn = document.getElementById("itinFavBtn");
    favBtn.className = "fav-btn" + (item.isFavorited ? " is-active" : "");
    favBtn.innerHTML =
      '<i class="fa-' + (item.isFavorited ? "solid" : "regular") + ' fa-heart"></i> ' + item.favoriteCount;

    document.getElementById("itinMeta").innerHTML =
      '<span><i class="fa-regular fa-calendar"></i> ' + item.days + " 天</span>" +
      '<span><i class="fa-regular fa-comment"></i> ' + item.comments.length + " 則留言</span>";

    document.getElementById("itinSummary").textContent = item.summary;

    document.getElementById("itinCarbon").innerHTML =
      '<div class="itin-detail-carbon__info"><i class="fa-solid fa-leaf"></i>' +
      "<span>相較全程自駕,此行程預估減碳 " +
      item.carbonSavedKg +
      " kg,加入行程計畫可獲得 <strong>" +
      item.pointsEarned +
      " 點</strong>減碳點數</span></div>" +
      '<button type="button" class="btn btn-primary btn-sm itin-detail-carbon__add" id="itinAddToPlanBtn">' +
      '<i class="fa-solid fa-plus"></i> 加入行程計畫</button>';

    document.getElementById("itinAddToPlanBtn").addEventListener("click", function () {
      window.location.href = "group-travel.html?itineraryId=" + encodeURIComponent(item.id);
    });

    document.getElementById("itinStops").innerHTML = item.stops
      .map(function (s) {
        var transport = s.transport
          ? '<span class="stop-list__transport"><i class="fa-solid fa-route"></i> ' + escapeHtml(s.transport) + "</span>"
          : "";
        return (
          '<li class="stop-list__item">' +
          ns.poiPlaceholder.render(s.image, "size-sm") +
          '<div class="stop-list__body">' +
          "<span class=\"stop-list__name\">" + escapeHtml(s.name) + "</span>" +
          '<span class="note">' + escapeHtml(s.note) + "</span>" +
          transport +
          "</div></li>"
        );
      })
      .join("");

    document.getElementById("itinCommentCount").textContent = "(" + item.comments.length + ")";

    document.getElementById("itinCommentList").innerHTML = item.comments.length
      ? item.comments
          .map(function (c) {
            var photos = (c.images || []).length
              ? '<div class="comment-item__photos">' +
                c.images
                  .map(function (src) {
                    return '<img src="' + src + '" alt="" />';
                  })
                  .join("") +
                "</div>"
              : "";
            return (
              '<div class="comment-item"><span class="name">' + escapeHtml(c.name) + "</span>" +
              escapeHtml(c.text) + '<span class="date">' + escapeHtml(c.date) + "</span>" +
              photos + "</div>"
            );
          })
          .join("")
      : '<p class="empty-comment-hint">還沒有留言,搶頭香吧!</p>';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
