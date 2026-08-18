# QIW9 的博客

极简风格博客，基于 [Jekyll](https://jekyllrb.com/) 构建，由 GitHub Pages 自动发布。

## 写新文章

在 [`_posts`](_posts) 目录下新建一个 Markdown 文件，文件名格式：

```
YYYY-MM-DD-文章标题.md
```

文件开头需要包含 front matter：

```markdown
---
layout: post
title: 文章标题
date: 2026-08-18
---

正文……
```

提交并推送到 `master` 分支后，GitHub Pages 会自动构建发布。

## 本地预览

```bash
bundle install
bundle exec jekyll serve
```

然后访问 http://localhost:4000。

## 目录结构

```
├── _config.yml          # 站点配置
├── _layouts/            # 页面模板
├── _posts/              # 博客文章（Markdown）
├── assets/style.css     # 样式
├── index.html           # 首页（文章列表）
├── about.md             # 关于页
└── 404.html
```
