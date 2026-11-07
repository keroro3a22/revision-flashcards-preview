# 小六英文生字卡（Revision Flashcards）

網站由這個倉庫的 `main` 分支根目錄部署到 GitHub Pages。

## 網站
https://keroro3a22.github.io/revision-flashcards-preview/

## 內容
- `index.html` — 首頁（Unit 1–4 + Dictation 3）
- `unit1/` … `unit4/` — **互動網頁生字卡**（音節、中文詞性、例句／進階例句、🔊 讀音；附小圖）
- `dictation3/` — 既有 Dictation 3 **圖片字卡**（點圖放大 + 🔊）

## 更新網站
1. 把改動 commit 並 push 到 `keroro3a22/revision-flashcards-preview` 的 `main`
2. GitHub Pages 會從 `main` 根目錄重新部署
3. 約 1–2 分鐘後開啟上述網址

## 注意
- 請勿上傳到 publish.my；本包專供 GitHub Pages。
- 所有路徑均為相對路徑，可離線開啟 `index.html` 預覽。單元和默書不登入也能用。

## 帳號
- 用使用者名稱和密碼註冊／登入（不是電郵，也不用確認信）。
- 登入後，徽章、練習進度、暱稱和上次字卡會存到帳號。同一時間只保留一部裝置的登入；新的登入會把另一部裝置登出。
- 瀏覽器只用 Supabase 的 publishable key（`assets/supabase-public.js`）。不要把 service-role key 放進這個靜態網站。
