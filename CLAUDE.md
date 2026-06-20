# CLAUDE.md — 習慣養成 (habit-grow) 技術規範

> 給 AI 或開發者的編輯參考。每次修改前先讀這份文件。

---

## 專案概覽

- **單一檔案 SPA PWA**：`habits.html` + `sw.js`，CSS/JS 全 inline，無框架、無 bundler
- **資料層**：全部存 `localStorage`，不上傳任何資訊
- **部署**：GitHub Pages — `https://wenhsi.github.io/habit-grow/`
- **離線**：Service Worker (`sw.js`) 快取 HTML，需 HTTPS / localhost 才生效

---

## 檔案結構

```
habit-grow/
├── habits.html       # 主程式（唯一需要編輯的檔案）
├── sw.js             # Service Worker，快取策略 cache-first
├── README.md
├── CLAUDE.md         # 本文件
└── assets/
    └── og-thumbnail.png
```

---

## 頁面定位（設計意圖）

- **主頁（home）** — 今天的打勾，支援回顧過去任意日期（viewDate 狀態）
- **排程（schedule）** — 專門排「未來」幾天的習慣清單；主頁也可快速調整今日排程
- **統計（stats）** — 各習慣完成次數與趨勢
- **習慣（habits）** — 習慣 CRUD、群組、重點培養（isFocus）
- **設定（settings）** — 匯出/匯入 JSON、重設資料

---

## localStorage 結構

```js
const K = {
  pw:       'h_pw',      // bcrypt-like hash，密碼保護
  sess:     'h_sess',    // 登入 session token
  habits:   'h_habits',  // Habit[]
  groups:   'h_groups',  // Group[]
  comps:    'h_comps',   // Completion[]
  scheds:   'h_scheds',  // { [dateKey]: habitId[] }
  statsort: 'h_ss',      // 統計排序偏好
  theme:    'h_theme',   // 'light' | 'dark'
  hist:     'h_hist',    // Hist 快照陣列（最多 20 筆）
  hidx:     'h_hidx',    // Hist 當前 index
}
```

### 資料格式

```ts
Habit       = { id, name, isFocus, groupId, createdAt }
Group       = { id, name, order }
Completion  = { id, habitId, at }   // at = ISO 8601
Schedule    = { [dateKey: string]: habitId[] }   // dateKey = 'YYYY-MM-DD'
HistSnapshot= { h, g, c, s, a }    // h/g/c/s = 各資料快照，a = action label
```

---

## 核心模組

### `S` — localStorage wrapper
```js
S.get(key, default)   // JSON.parse，找不到回傳 default
S.set(key, value)     // JSON.stringify
```

### `DB` — 資料存取層
所有讀寫都經由 DB 方法。`saveHabits / saveGroups / saveComps / saveScheds` 已被 patch，每次寫入後自動觸發 `Hist.schedSnap()`。

重要方法：
- `DB.getOrCreateDay(dk)` — 建立排程日（若不存在）並自動注入重點培養習慣，**會寫入**
- `DB.setDay(dk, ids)` — 覆寫某日排程，自動去重
- `DB.isDoneOnDay(id, dk)` — 判斷某日是否完成
- `DB.addCompOnDay(habitId, dk)` — 補打勾（非今天用 `dk+'T12:00:00'`）
- `DB.syncFocusChange(id, nowFocus)` — 重點培養改變時同步未來排程

### `Hist` — Undo/Redo
- 最多 20 步，快照存 localStorage，跨頁面重整保留
- 模型：stack = 所有狀態（含初始），idx 指向當前；undo → idx-1，redo → idx+1
- **關鍵**：`_snap = true` 期間的 DB 寫入不觸發新快照（避免 restore 時的 render 產生副作用）
- `_snap` 在 `_restore()` 裡保持到 `render()` 完成後才關掉
- 每個 action 前呼叫 `Hist.label('描述')` 設定 action label，由 `_snapshot()` 讀取後重置

```js
Hist.label('新增習慣「跑步」');
DB.saveHabits(all);   // patch 自動 schedSnap
```

### `Router` — 頁面切換
- `Router.go(page)` — 切頁、觸發 render、更新 nav active
- 離開 schedule 時自動執行 `cleanupEmptyScheduleDays()`（移除未來空日期）
- 切到 home 時重置 `viewDate = dateKey()`
- 切頁後呼叫 `updateUndoBtns()`

### `Pages` — 各頁渲染
```js
Pages.home.render()
Pages.schedule.render()
Pages.stats.render()
Pages.habits.render()
Pages.settings.render()
```

每個 page 都是純粹的「讀資料 → 生成 DOM」，不做副作用。

### `AC` — Autocomplete 元件
- `new AC(inputEl, dropdownEl, { getOptions, onSelect, allowCreate })`
- Dropdown 偵測下方空間不足（< 150px）時自動往上展開（flip-up）
- `autocomplete="off"` 防止瀏覽器原生建議干擾

---

## CSS 設計系統

### CSS Variables（亮色）
| 變數 | 用途 |
|------|------|
| `--bg` | 頁面背景 `#F7F6F3` |
| `--surface` | 卡片、浮層背景 `#FFFFFF` |
| `--border` | 邊框、分隔線 `#E9E5DE` |
| `--text` | 主文字 `#2A2826` |
| `--sub` | 次要文字、placeholder `#9C9890` |
| `--accent` | 主色（綠） `#6B9E8B` |
| `--danger` | 刪除、警示 `#C96C62` |
| `--done` | 已完成淡色 `#C4C0B8` |
| `--focus-*` | 重點培養暖橘黃系 |
| `--r` | 圓角 `10px` |
| `--nav` | 底部 nav 高度 `58px` |
| `--header` | 頂部 header 高度 `50px` |

深色模式透過 `[data-theme="dark"]` 覆蓋以上變數，不用 `@media prefers-color-scheme`（使用者手動切換）。

### Layout 結構
```
<header class="app-header">  固定頂部，z-index:200，blur backdrop
<div id="app">
  <div class="page" id="page-home">    只有 active class 才顯示
  <div class="page" id="page-schedule">
  ...
<nav class="bottom-nav">     固定底部，z-index:100
```

`.page` 的 `padding-top` 補 `calc(var(--header) + env(safe-area-inset-top) + 16px)`。

---

## 重要邏輯細節

### 日期
- `dateKey(d?)` — 回傳 `'YYYY-MM-DD'`（本地時區）
- `localISO()` — 回傳本地 ISO 8601 字串（非 UTC）
- Completion 的 `at` 欄位一律存本地時間，比對時 `.slice(0,10)` 取日期部分

### 排程清理
- `cleanupEmptyScheduleDays()` — 移除「今天之後且無習慣」的排程日期
- 只在離開 schedule tab 時執行（Router.go），不在 render 內執行

### 空習慣防護
- `cleanupOrphanHabits()` — 登入時移除排程中已不存在的 habitId

### 打勾動畫
- `.check-btn` 點擊時加 `.on.popping`（keyframe `pop`）
- 延遲 300ms 後才執行 `onChange`，讓動畫先播完

### date input 日曆觸發
- input 用 `opacity:0.01; pointer-events:none` 隱藏但保留佔位
- JS 呼叫 `input.showPicker()` 觸發原生日曆
- 位置固定 `margin-top:-36px; margin-left:16px`（偏左對齊）

### Toast 通知
- `showToast(msg)` — 底部浮現 pill，1.8 秒消失
- 用於 Undo/Redo 操作回饋

### 使用者回饋規範（規則三）
| 情境 | 方式 |
|------|------|
| Undo / Redo | Toast |
| 高風險操作（刪除、覆寫） | `showConfirm()` Modal |
| 輸入錯誤、一般提示 | `showAlert()` Modal |

---

## 編輯守則

1. **不要 import 外部函式庫**，保持單一 HTML 可直接開啟
2. **DB 寫入一律透過 `DB.save*` 方法**，不要直接呼叫 `S.set(K.habits, ...)`（會繞過 Hist patch）
3. **action 前必須呼叫 `Hist.label('...')`**，讓 undo 提示有意義
4. **render 方法不做副作用**（不寫 DB、不更新全域狀態），只讀資料 → 生成 DOM
5. **新增 CSS 變數**請同時在 `:root` 和 `[data-theme="dark"]` 各加一份
6. **日期比對**一律用 `dateKey()` 或 `.slice(0,10)`，不用 `toLocaleDateString()`
7. **SW cache 版本**（`sw.js` 裡的 `CACHE = 'habit-grow-v1'`）修改後需手動遞增版本號讓舊 cache 失效
