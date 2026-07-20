/**
 * news-page.js
 * 最新消息頁(pages/news.html)邏輯:無 id 時顯示列表,帶 ?id= 時顯示單篇詳情。
 */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;
    var params = new URLSearchParams(window.location.search);
    var id = params.get("id");

    if (id) {
      showDetail(ns, id);
    } else {
      showList(ns);
    }
  });

  function showList(ns) {
    document.getElementById("newsTitle").textContent = "嘉義最新消息";
    ns.newsService.getNewsList().then(function (list) {
      document.getElementById("newsListView").innerHTML = list
        .map(function (item) {
          return (
            '<a class="card news-list-item" href="news.html?id=' + item.id + '">' +
            ns.poiPlaceholder.render(item.image, "size-sm") +
            '<div class="news-list-item__body">' +
            "<h3>" + item.title + "</h3>" +
            '<p class="meta">' + item.date + " · " + item.category + "</p>" +
            '<p class="summary">' + item.summary + "</p>" +
            "</div>" +
            "</a>"
          );
        })
        .join("");
    });
  }

  function showDetail(ns, id) {
    document.getElementById("newsListView").style.display = "none";
    var detailView = document.getElementById("newsDetailView");
    detailView.style.display = "block";

    ns.newsService.getNewsById(id).then(function (item) {
      if (!item) {
        detailView.innerHTML = '<div class="empty-state"><p>找不到這則消息</p></div>';
        return;
      }
      document.getElementById("newsTitle").textContent = "最新消息";
      detailView.innerHTML =
        '<button class="news-back-link" onclick="history.back()"><i class="fa-solid fa-arrow-left"></i> 返回列表</button>' +
        '<div class="news-detail-hero">' + ns.poiPlaceholder.render(item.image, "size-lg") + "</div>" +
        '<div class="news-detail-body">' +
        "<h1>" + item.title + "</h1>" +
        '<p class="meta">' + item.date + " · " + item.category + "</p>" +
        '<p class="content">' + item.content + "</p>" +
        (item.sourceUrl
          ? '<a class="news-source-link" href="' + item.sourceUrl + '" target="_blank" rel="noopener noreferrer">查看文章 <i class="fa-solid fa-arrow-up-right-from-square"></i></a>'
          : "") +
        "</div>";
    });
  }
})();
