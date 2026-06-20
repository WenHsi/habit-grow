# 習慣養成

個人習慣追蹤工具，單一 HTML 檔案，無需後端、無需安裝。

**[👉 開啟 App](https://wenhsi.github.io/habit-grow/)**

---

## 功能

- **主頁** — 每日打勾，支援回顧過去任意日期
- **排程** — 為未來日期安排習慣清單
- **統計** — 每個習慣的完成次數與趨勢
- **習慣管理** — 新增、改名、刪除、分群組、設為重點培養
- **深色模式** — 一鍵切換，設定持久化
- **復原 / 重做** — ⌘Z / ⌘⇧Z，儲存 20 步，關掉瀏覽器再開還在
- **匯出 / 匯入** — 備份為 JSON，跨裝置還原
- **PWA** — 可加到桌面，支援離線使用
- **密碼保護** — 啟動時需要輸入密碼

---

## 使用方式

直接開啟 `habits.html`，或部署到任意靜態主機。

### 離線支援（PWA）

需透過 HTTPS 或 localhost 存取才能啟用 Service Worker。`sw.js` 與 `habits.html` 放在同一目錄即可。

```
habit-grow/
├── habits.html
├── sw.js
└── assets/
    └── og-thumbnail.png
```

### 本地預覽

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .
```

---

## 技術

- 純 HTML / CSS / JavaScript，無框架
- 資料全存 `localStorage`，不上傳任何資訊
- Service Worker 快取，斷網可用
- 單一 `habits.html`，CSS 與 JS 全 inline

---

## 授權

MIT © [wenhsi](https://github.com/WenHsi)
