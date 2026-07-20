/**
 * group-service.js
 * 「揪團旅行」服務層:demo 階段以 localStorage 模擬多人揪團行為(建立/加入/成員清單)。
 * 正式上線需改為後端帳號系統 + 資料庫,才能讓不同裝置的使用者真正共用同一個揪團。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var GROUPS_KEY = "funjia_groups"; // { [code]: groupObject }
  var MY_GROUPS_KEY = "funjia_my_group_codes"; // [code, ...]
  var CREATED_GROUPS_KEY = "funjia_created_group_codes"; // [code, ...] 我建立(非單純加入)的揪團
  var MEMORIES_KEY = "funjia_group_memories"; // { [code]: [{id,author,text,date,images}] }
  var CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var MAX_MEMORY_IMAGES = 3;

  function readGroups() {
    try {
      return JSON.parse(localStorage.getItem(GROUPS_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function writeGroups(groups) {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
  }

  function readMyCodes() {
    try {
      return JSON.parse(localStorage.getItem(MY_GROUPS_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function addMyCode(code) {
    var codes = readMyCodes();
    if (codes.indexOf(code) === -1) {
      codes.push(code);
      localStorage.setItem(MY_GROUPS_KEY, JSON.stringify(codes));
    }
  }

  function readCreatedCodes() {
    try {
      return JSON.parse(localStorage.getItem(CREATED_GROUPS_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function addCreatedCode(code) {
    var codes = readCreatedCodes();
    if (codes.indexOf(code) === -1) {
      codes.push(code);
      localStorage.setItem(CREATED_GROUPS_KEY, JSON.stringify(codes));
    }
  }

  function removeCreatedCode(code) {
    var codes = readCreatedCodes().filter(function (c) {
      return c !== code;
    });
    localStorage.setItem(CREATED_GROUPS_KEY, JSON.stringify(codes));
  }

  /** 是否為我在此瀏覽器建立的揪團(而非單純加入),用來判斷是否可編輯/刪除行程 */
  function isOwner(code) {
    return readCreatedCodes().indexOf((code || "").toUpperCase()) !== -1;
  }

  function generateCode() {
    var code = "";
    for (var i = 0; i < 6; i++) {
      code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
    }
    return code;
  }

  function createGroup(options) {
    var groups = readGroups();
    var code = generateCode();
    var group = {
      code: code,
      name: options.name,
      date: options.date,
      mode: options.mode || "preset", // "preset" 平台推薦行程 | "custom" 自行建立行程
      itineraryId: options.itineraryId || null,
      itineraryTitle: options.itineraryTitle || null,
      stops: options.stops || [], // [{name, note}]
      plan: options.plan || null, // 平台計算的最佳動線(itineraryPlannerService 產出,含分日/住宿/交通資訊)
      tripLength: options.tripLength || null, // "half" | "day" | "multi",供行程摘要顯示天數類型標籤
      creatorName: options.creatorName,
      members: [options.creatorName],
      inviteEnabled: !!options.inviteEnabled,
      createdAt: new Date().toISOString(),
    };
    groups[code] = group;
    writeGroups(groups);
    addMyCode(code);
    addCreatedCode(code);
    return group;
  }

  /** 更新我建立的旅遊計畫(行程名稱/日期/站點),供「我的旅遊計畫」編輯用 */
  function updateGroup(code, updates) {
    var groups = readGroups();
    var normalizedCode = (code || "").toUpperCase();
    var group = groups[normalizedCode];
    if (!group) return null;
    if (updates.name != null) group.name = updates.name;
    if (updates.date != null) group.date = updates.date;
    if (updates.stops != null) group.stops = updates.stops;
    groups[normalizedCode] = group;
    writeGroups(groups);
    return group;
  }

  /** 刪除我建立的旅遊計畫,並清除相關的我的清單與回憶記錄 */
  function deleteGroup(code) {
    var normalizedCode = (code || "").toUpperCase();
    var groups = readGroups();
    delete groups[normalizedCode];
    writeGroups(groups);

    var myCodes = readMyCodes().filter(function (c) {
      return c !== normalizedCode;
    });
    localStorage.setItem(MY_GROUPS_KEY, JSON.stringify(myCodes));
    removeCreatedCode(normalizedCode);

    var allMemories = readMemories();
    delete allMemories[normalizedCode];
    writeMemories(allMemories);
  }

  function joinGroup(code, nickname) {
    var groups = readGroups();
    var group = groups[code.toUpperCase()];
    if (!group) {
      return null;
    }
    if (group.members.indexOf(nickname) === -1) {
      group.members.push(nickname);
      groups[group.code] = group;
      writeGroups(groups);
    }
    addMyCode(group.code);
    return group;
  }

  function getGroupByCode(code) {
    var groups = readGroups();
    return groups[(code || "").toUpperCase()] || null;
  }

  function getMyGroups() {
    var groups = readGroups();
    return readMyCodes()
      .map(function (code) {
        return groups[code];
      })
      .filter(Boolean)
      .sort(function (a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }

  /** 建立當下未立即邀請好友,之後在「我的揪團」點「邀請好友」時才標記為已開啟邀請 */
  function enableInvite(code) {
    var groups = readGroups();
    var group = groups[(code || "").toUpperCase()];
    if (!group) return null;
    group.inviteEnabled = true;
    groups[group.code] = group;
    writeGroups(groups);
    return group;
  }

  function readMemories() {
    try {
      return JSON.parse(localStorage.getItem(MEMORIES_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function writeMemories(all) {
    localStorage.setItem(MEMORIES_KEY, JSON.stringify(all));
  }

  /** 取得某揪團的回憶記錄(依時間新到舊) */
  function getMemories(code) {
    var all = readMemories();
    var list = all[(code || "").toUpperCase()] || [];
    return list.slice().reverse();
  }

  /** 新增一則回憶記錄(文字留言 + 最多 3 張照片,images 為 dataURL 陣列) */
  function addMemory(code, author, text, images) {
    var normalizedCode = (code || "").toUpperCase();
    var all = readMemories();
    var list = all[normalizedCode] || [];
    var memory = {
      id: "mem-" + Date.now(),
      author: author || "匿名旅人",
      text: text,
      images: (images || []).slice(0, MAX_MEMORY_IMAGES),
      date: new Date().toISOString().slice(0, 10),
    };
    list.push(memory);
    all[normalizedCode] = list;
    writeMemories(all);
    return memory;
  }

  ns.groupService = {
    createGroup: createGroup,
    updateGroup: updateGroup,
    deleteGroup: deleteGroup,
    isOwner: isOwner,
    joinGroup: joinGroup,
    getGroupByCode: getGroupByCode,
    getMyGroups: getMyGroups,
    enableInvite: enableInvite,
    getMemories: getMemories,
    addMemory: addMemory,
    maxMemoryImages: MAX_MEMORY_IMAGES,
  };
})(window.FunJia);
