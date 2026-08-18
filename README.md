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

## 分类与标签

在 front matter 中声明分类和标签：

```markdown
---
layout: post
title: 文章标题
date: 2026-08-18
categories: [随笔, 技术]
tags: [jekyll, 博客]
---
```

文章页会显示分类和标签，点击可跳转到分类标签归档页 [`/tags.html`](https://QIW9.github.io/tags.html)。

## 管理后台

访问 [`/admin/`](https://QIW9.github.io/admin/)，可以不用写代码、直接在浏览器里发布、编辑、删除文章。

首次使用需要配置：

1. 在 GitHub 创建 Personal Access Token（Settings → Developer settings → Personal access tokens），权限勾选仓库 Contents 的读写（公开仓库选 `public_repo` 即可）。
2. 打开管理后台，填入仓库所有者（`QIW9`）、仓库名（`QIW9.github.io`）和令牌，点击「保存并加载文章」。
3. 填写标题、日期、分类、标签和 Markdown 正文，点「发布文章」。

发布后 GitHub API 会把 Markdown 文件直接提交到 `_posts` 目录，GitHub Pages 约 1 分钟后自动构建更新。

> 令牌只保存在你当前浏览器的 localStorage 中，直接调用 GitHub 官方 API，不经过任何第三方服务器。请勿在公共电脑上使用。

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
