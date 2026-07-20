/**
 * news-service.js
 * 嘉義最新消息服務層。未來可替換為政府資料開放平臺
 * 嘉義市政府網站-新聞/活動資料集(data.gov.tw)。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  // 後台「發送推播」的訊息會存於此,狀態為 sent 時併入最新消息列表一起顯示
  var PUSH_KEY = "funjia_admin_push_messages"; // [{id,title,summary,content,date,category,image,audience,status,stats}]

  function readPushMessages() {
    try {
      return JSON.parse(localStorage.getItem(PUSH_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function writePushMessages(list) {
    localStorage.setItem(PUSH_KEY, JSON.stringify(list));
  }

  function getNewsList() {
    return ns.dataService.fetchJson("news.json").then(function (list) {
      var sentPush = readPushMessages().filter(function (m) {
        return m.status === "sent";
      });
      // 依日期新到舊排序
      return list.concat(sentPush).sort(function (a, b) {
        return new Date(b.date) - new Date(a.date);
      });
    });
  }

  function getNewsById(id) {
    return getNewsList().then(function (list) {
      return list.find(function (item) {
        return item.id === id;
      });
    });
  }

  /** 後台專用:取得全部推播訊息(含草稿/排程中/已發送) */
  function getPushMessages() {
    return readPushMessages().sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });
  }

  /** 後台專用:建立推播訊息 */
  function addPushMessage(data) {
    var list = readPushMessages();
    var item = Object.assign(
      {
        id: "push-" + Date.now(),
        title: "",
        summary: "",
        content: "",
        category: "推播訊息",
        image: "news-eco",
        audience: "全體使用者",
        status: "draft", // draft | scheduled | sent
        date: new Date().toISOString().slice(0, 10),
        stats: { sentCount: 0, openRate: 0, clickRate: 0 },
      },
      data
    );
    list.push(item);
    writePushMessages(list);
    return item;
  }

  /** 後台專用:更新推播訊息狀態或內容 */
  function updatePushMessage(id, patch) {
    var list = readPushMessages();
    var index = list.findIndex(function (item) {
      return item.id === id;
    });
    if (index === -1) return null;
    list[index] = Object.assign({}, list[index], patch);
    writePushMessages(list);
    return list[index];
  }

  /** 後台專用:取消排程中的推播 */
  function removePushMessage(id) {
    writePushMessages(
      readPushMessages().filter(function (item) {
        return item.id !== id;
      })
    );
  }

  ns.newsService = {
    getNewsList: getNewsList,
    getNewsById: getNewsById,
    getPushMessages: getPushMessages,
    addPushMessage: addPushMessage,
    updatePushMessage: updatePushMessage,
    removePushMessage: removePushMessage,
  };
})(window.FunJia);
