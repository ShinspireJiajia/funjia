/**
 * detail-page.js
 * 共用詳情頁(pages/detail.html)邏輯:依 ?type=&id= 讀取單一 POI 資料並渲染。
 */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;
    var params = new URLSearchParams(window.location.search);
    var type = params.get("type");
    var id = params.get("id");
    var currentItem = null;

    ns.poiService.getById(type, id).then(function (item) {
      if (!item) {
        document.querySelector(".detail-body").innerHTML =
          '<div class="empty-state"><i class="fa-regular fa-face-frown"></i><p>找不到這筆資料</p></div>';
        return;
      }
      currentItem = item;
      renderDetail(item);
    });

    // 無障礙/分眾標籤名稱依語言顯示,切換語言時就地重繪,不必重新查詢資料
    document.addEventListener("funjia:lang-changed", function () {
      if (currentItem) renderA11yTags(currentItem);
    });

    function renderA11yTags(item) {
      var el = document.getElementById("detailA11yTags");
      if (!Array.isArray(item.a11yTags) || !item.a11yTags.length || !ns.a11yTags) {
        el.innerHTML = "";
        return;
      }
      el.innerHTML = item.a11yTags
        .map(function (code) {
          var def = ns.a11yTags.get(code);
          if (!def) return "";
          return (
            '<span class="detail-a11y-chip" style="background:' + def.color + ';">' +
            '<i class="fa-solid ' + def.icon + '"></i> ' + ns.a11yTags.label(code) +
            "</span>"
          );
        })
        .join("");
    }

    function renderDetail(item) {
      document.title = item.name + "｜Fun 嘉";
      document.getElementById("detailHero").insertAdjacentHTML(
        "afterbegin",
        ns.poiPlaceholder.render(item.image, "size-lg", item.photo)
      );
      document.getElementById("detailName").textContent = item.name;

      if (item.rating) {
        document.getElementById("detailRating").innerHTML =
          '<i class="fa-solid fa-star"></i> ' + item.rating;
      }

      var userTag = item.isUserCreated
        ? '<span class="tag tag-accent"><i class="fa-solid fa-user-pen"></i> 使用者新增</span>'
        : "";
      document.getElementById("detailTags").innerHTML =
        userTag +
        (item.tags || [])
          .map(function (tag) {
            return '<span class="tag">' + tag + "</span>";
          })
          .join("");

      renderA11yTags(item);

      document.getElementById("detailInfoList").innerHTML = buildInfoRows(item);
      document.getElementById("detailActions").innerHTML = buildActions(item);
      document.getElementById("detailDescription").textContent = item.description || "";

      if (item.isLowCarbonTransfer) {
        document.getElementById("lowCarbonBanner").innerHTML =
          '<div class="low-carbon-banner"><i class="fa-solid fa-leaf"></i>' +
          "<span>停車轉乘公車上山,即可累積「嘉義綠遊積分」(功能規劃中,敬請期待)。</span></div>";
      }

      if (Array.isArray(item.routes) && item.routes.length) {
        var routesEl = document.getElementById("detailRoutes");
        routesEl.style.display = "block";
        routesEl.innerHTML =
          "<h2>公車動態</h2>" +
          item.routes
            .map(function (r) {
              return (
                '<div class="detail-route-item"><span>' +
                r.routeName +
                " · " +
                r.direction +
                '</span><span class="eta">約 ' +
                r.eta +
                " 分</span></div>"
              );
            })
            .join("");
      }

      if (item.type === "attractions" && item.lat && item.lng) {
        renderNearby(item);
      }
    }

    /** 依直線距離找出景點附近的停車場與公車站(demo 以 8 公里內、最近 3 筆為範圍) */
    var NEARBY_RADIUS_KM = 8;
    var NEARBY_LIMIT = 3;

    function renderNearby(item) {
      ns.poiService.getList("parking").then(function (list) {
        renderNearbySection("detailNearbyParking", "附近停車場", "fa-square-parking", list, item);
      });
      ns.poiService.getList("bus").then(function (list) {
        renderNearbySection("detailNearbyBus", "附近公共運輸", "fa-bus", list, item);
      });
    }

    function renderNearbySection(elId, title, icon, list, origin) {
      var nearby = list
        .map(function (poi) {
          return { poi: poi, distanceKm: ns.routeService.distanceKm(origin, poi) };
        })
        .filter(function (entry) {
          return entry.distanceKm <= NEARBY_RADIUS_KM;
        })
        .sort(function (a, b) {
          return a.distanceKm - b.distanceKm;
        })
        .slice(0, NEARBY_LIMIT);

      var el = document.getElementById(elId);
      if (!nearby.length) {
        el.style.display = "none";
        return;
      }
      el.style.display = "block";
      el.innerHTML =
        "<h2>" + title + "</h2>" +
        nearby
          .map(function (entry) {
            return buildNearbyRow(entry.poi, entry.distanceKm, icon);
          })
          .join("");
    }

    function buildNearbyRow(poi, distanceKm, icon) {
      var metaBits = [formatDistance(distanceKm)];
      if (typeof poi.availableSpaces === "number") {
        metaBits.push("剩餘 " + poi.availableSpaces + "/" + poi.totalSpaces + " 格");
      }
      if (Array.isArray(poi.routes) && poi.routes.length) {
        metaBits.push(poi.routes[0].routeName + " 約 " + poi.routes[0].eta + " 分到站");
      }
      return (
        '<a class="detail-nearby-item" href="detail.html?type=' + poi.type + "&id=" + poi.id + '">' +
        '<i class="fa-solid ' + icon + '"></i>' +
        '<span class="detail-nearby-item__body"><strong>' + poi.name + "</strong><span>" + metaBits.join(" · ") + "</span></span>" +
        '<i class="fa-solid fa-chevron-right"></i>' +
        "</a>"
      );
    }

    function formatDistance(km) {
      return km < 1 ? Math.round(km * 1000) + " 公尺" : km.toFixed(1) + " 公里";
    }

    function buildInfoRows(item) {
      var rows = [];
      if (item.address) {
        rows.push(row("fa-location-dot", item.address));
      }
      if (item.hours) {
        rows.push(row("fa-regular fa-clock", item.hours, true));
      }
      if (item.phone && item.phone !== "-") {
        rows.push(row("fa-phone", item.phone));
      }
      if (item.priceRange) {
        rows.push(row("fa-tag", item.priceRange));
      }
      if (item.startDate) {
        rows.push(row("fa-calendar-days", item.startDate + " ～ " + item.endDate));
      }
      if (typeof item.availableSpaces === "number") {
        rows.push(
          row(
            "fa-square-parking",
            "剩餘 " + item.availableSpaces + " / " + item.totalSpaces + " 格・" + item.feeInfo
          )
        );
      }
      if (typeof item.availableBikes === "number") {
        rows.push(
          row(
            "fa-bicycle",
            "可借 " + item.availableBikes + " 輛・可還 " + item.availableDocks + " 位(總車格 " + item.totalDocks + ")"
          )
        );
      }
      return rows.join("");
    }

    function row(iconClass, text, isRegular) {
      var prefix = isRegular ? "" : "fa-solid ";
      return (
        '<div class="info-row"><i class="' + prefix + iconClass + '"></i><span>' + text + "</span></div>"
      );
    }

    function buildActions(item) {
      var actions = "";
      if (item.lat && item.lng) {
        actions +=
          '<a class="btn btn-primary" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' +
          item.lat +
          "," +
          item.lng +
          '"><i class="fa-solid fa-map-location-dot"></i> 導航前往</a>';
      }
      if (item.phone && item.phone !== "-") {
        actions +=
          '<a class="btn btn-outline" href="tel:' + item.phone + '"><i class="fa-solid fa-phone"></i> 撥打電話</a>';
      }
      return actions;
    }
  });
})();
