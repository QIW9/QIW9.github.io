(function () {
  "use strict";

  const API = "https://api.github.com";
  const KEY = "blog.admin";

  const $ = (id) => document.getElementById(id);

  let editing = null;
  let statusTimer = null;

  function getSettings() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveSettings(s) {
    localStorage.setItem(KEY, JSON.stringify(s));
  }

  function today() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function showStatus(msg, type) {
    const el = $("status");
    el.textContent = msg;
    el.className = type || "";
    el.hidden = false;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      el.hidden = true;
    }, 6000);
  }

  async function gh(path, opts) {
    const s = getSettings();
    const headers = Object.assign(
      {
        Authorization: "Bearer " + s.token,
        Accept: "application/vnd.github+json",
      },
      opts && opts.headers
    );
    const res = await fetch(API + path, Object.assign({}, opts, { headers }));
    if (!res.ok) {
      let msg = "HTTP " + res.status;
      try {
        const j = await res.json();
        msg = j.message || msg;
      } catch (e) {
        /* ignore */
      }
      throw new Error(msg);
    }
    return res.json();
  }

  function encPath(p) {
    return p.split("/").map(encodeURIComponent).join("/");
  }

  function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  function base64ToUtf8(b64) {
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function yamlStr(v) {
    return '"' + String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
  }

  function parseFrontMatter(raw) {
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) return null;
    const data = { body: m[2].trim() };
    let lastKey = null;
    m[1].split(/\r?\n/).forEach((line) => {
      const listItem = line.match(/^\s*-\s+(.+)$/);
      const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
      if (listItem && lastKey) {
        data[lastKey].push(listItem[1].trim().replace(/^['"]|['"]$/g, ""));
        return;
      }
      lastKey = null;
      if (!kv) return;
      const key = kv[1];
      let val = kv[2].trim();
      if (val.startsWith("[") && val.endsWith("]")) {
        val = val
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
          .filter(Boolean);
        lastKey = key;
        data[key] = val;
      } else if (key === "categories" || key === "tags") {
        data[key] = val
          .split(",")
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
          .filter(Boolean);
      } else {
        data[key] = val.replace(/^['"]|['"]$/g, "");
      }
    });
    return data;
  }

  function slugify(s) {
    return (
      s
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\p{L}\p{N}\-_]+/gu, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "post"
    );
  }

  function splitField(v) {
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function buildPost() {
    const title = $("title").value.trim();
    const date = $("date").value;
    const description = $("description").value.trim();
    const categories = splitField($("categories").value);
    const tags = splitField($("tags").value);
    const body = $("content").value.trim();

    const lines = [
      "---",
      "layout: post",
      "title: " + yamlStr(title),
      "date: " + date,
    ];
    if (description) lines.push("description: " + yamlStr(description));
    if (categories.length) lines.push("categories: [" + categories.join(", ") + "]");
    if (tags.length) lines.push("tags: [" + tags.join(", ") + "]");
    lines.push("---", "", body, "");
    return lines.join("\n");
  }

  function renderPostList(posts) {
    const list = $("post-list");
    if (!posts.length) {
      list.innerHTML = '<p class="muted">还没有文章。</p>';
      return;
    }
    list.innerHTML = "";
    posts.forEach((p) => {
      const row = document.createElement("div");
      row.className = "post-row";

      const left = document.createElement("div");
      const title = document.createElement("div");
      title.className = "post-title";
      title.textContent = p.title;
      const meta = document.createElement("div");
      meta.className = "post-date";
      const bits = [];
      if (p.date) bits.push(p.date);
      if (p.categories.length) bits.push("分类：" + p.categories.join(" / "));
      if (p.tags.length) bits.push("标签：" + p.tags.join(" / "));
      meta.textContent = bits.join(" · ");
      left.appendChild(title);
      left.appendChild(meta);

      const buttons = document.createElement("div");
      buttons.className = "post-buttons";
      const editBtn = document.createElement("button");
      editBtn.textContent = "编辑";
      editBtn.addEventListener("click", () => startEdit(p));
      const delBtn = document.createElement("button");
      delBtn.textContent = "删除";
      delBtn.className = "danger";
      delBtn.addEventListener("click", () => deletePost(p));
      buttons.appendChild(editBtn);
      buttons.appendChild(delBtn);

      row.appendChild(left);
      row.appendChild(buttons);
      list.appendChild(row);
    });
  }

  async function loadPosts() {
    const s = getSettings();
    if (!s.owner || !s.repo || !s.token) {
      showStatus("请先填写仓库信息并保存令牌", "error");
      return;
    }
    $("btn-refresh").disabled = true;
    $("post-status").hidden = false;
    $("post-status").textContent = "加载中……";
    try {
      let items = [];
      try {
        items = await gh(
          "/repos/" + s.owner + "/" + s.repo + "/contents/_posts?ref=" + encodeURIComponent(s.branch || "master")
        );
      } catch (e) {
        if (e.message.indexOf("404") !== -1) {
          items = [];
        } else {
          throw e;
        }
      }
      const posts = items
        .filter((it) => it.name.endsWith(".md"))
        .map((it) => {
          let title = it.name.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
          let date = it.name.slice(0, 10);
          let categories = [];
          let tags = [];
          if (it.content) {
            const fm = parseFrontMatter(base64ToUtf8(it.content));
            if (fm) {
              title = fm.title || title;
              date = fm.date || date;
              categories = fm.categories || [];
              tags = fm.tags || [];
            }
          }
          return {
            name: it.name,
            path: it.path,
            sha: it.sha,
            title: title,
            date: date,
            categories: categories,
            tags: tags,
          };
        })
        .sort((a, b) => b.name.localeCompare(a.name));
      renderPostList(posts);
      $("post-status").hidden = true;
    } catch (e) {
      $("post-status").textContent = "加载失败：" + e.message;
    } finally {
      $("btn-refresh").disabled = false;
    }
  }

  function resetEditor() {
    editing = null;
    ["title", "slug", "categories", "tags", "description", "content"].forEach((id) => ($(id).value = ""));
    $("date").value = today();
    $("editor-title").textContent = "发布文章";
    $("btn-publish").textContent = "发布文章";
    $("btn-cancel").hidden = true;
    $("btn-delete").hidden = true;
    $("edit-hint").hidden = true;
  }

  function fillEditor(fm, post) {
    $("title").value = fm.title || "";
    $("date").value = fm.date || post.date || today();
    $("slug").value = post.name.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
    $("categories").value = (fm.categories || []).join(", ");
    $("tags").value = (fm.tags || []).join(", ");
    $("description").value = fm.description || "";
    $("content").value = fm.body || "";
    $("editor-title").textContent = "编辑文章";
    $("btn-publish").textContent = "保存修改";
    $("btn-cancel").hidden = false;
    $("btn-delete").hidden = false;
    $("edit-hint").hidden = false;
    $("edit-path").textContent = post.path;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function startEdit(post) {
    const s = getSettings();
    try {
      const it = await gh(
        "/repos/" + s.owner + "/" + s.repo + "/contents/" + encPath(post.path) + "?ref=" + encodeURIComponent(s.branch || "master")
      );
      const fm = parseFrontMatter(base64ToUtf8(it.content)) || { body: "" };
      editing = { path: post.path, sha: it.sha, name: post.name };
      fillEditor(fm, post);
    } catch (e) {
      showStatus("读取文章失败：" + e.message, "error");
    }
  }

  async function publish() {
    const s = getSettings();
    if (!s.owner || !s.repo || !s.token) {
      showStatus("请先填写仓库信息并保存令牌", "error");
      return;
    }
    const title = $("title").value.trim();
    const date = $("date").value;
    if (!title) return showStatus("请填写标题", "error");
    if (!date) return showStatus("请填写日期", "error");
    if (!$("content").value.trim()) return showStatus("请填写正文", "error");

    const content = buildPost();
    const branch = s.branch || "master";
    const body = {
      message: editing ? "Update: " + title : "Post: " + title,
      content: utf8ToBase64(content),
      branch: branch,
    };

    const btn = $("btn-publish");
    btn.disabled = true;
    try {
      if (editing) {
        body.sha = editing.sha;
        await gh(
          "/repos/" + s.owner + "/" + s.repo + "/contents/" + encPath(editing.path),
          { method: "PUT", body: JSON.stringify(body) }
        );
        showStatus("已保存修改：「" + title + "」", "success");
      } else {
        const slug = $("slug").value.trim() || slugify(title);
        const path = "_posts/" + date + "-" + slug + ".md";
        await gh(
          "/repos/" + s.owner + "/" + s.repo + "/contents/" + encPath(path),
          { method: "PUT", body: JSON.stringify(body) }
        );
        showStatus("已发布：「" + title + "」，GitHub Pages 约 1 分钟后自动更新", "success");
      }
      resetEditor();
      loadPosts();
    } catch (e) {
      showStatus("操作失败：" + e.message, "error");
    } finally {
      btn.disabled = false;
    }
  }

  async function deletePost(post) {
    const s = getSettings();
    if (!confirm('确定删除「' + post.title + '」吗？删除后无法恢复。')) return;
    const btn = $("btn-delete");
    btn.disabled = true;
    try {
      await gh(
        "/repos/" + s.owner + "/" + s.repo + "/contents/" + encPath(post.path),
        {
          method: "DELETE",
          body: JSON.stringify({
            message: "Delete: " + post.name,
            sha: post.sha,
            branch: s.branch || "master",
          }),
        }
      );
      if (editing && editing.path === post.path) resetEditor();
      showStatus("已删除：「" + post.title + "」", "success");
      loadPosts();
    } catch (e) {
      showStatus("删除失败：" + e.message, "error");
    } finally {
      btn.disabled = false;
    }
  }

  function init() {
    const s = getSettings();
    $("owner").value = s.owner || "";
    $("repo").value = s.repo || "";
    $("branch").value = s.branch || "master";
    $("token").value = s.token || "";
    $("date").value = today();

    $("btn-connect").addEventListener("click", () => {
      saveSettings({
        owner: $("owner").value.trim(),
        repo: $("repo").value.trim(),
        branch: $("branch").value.trim() || "master",
        token: $("token").value.trim(),
      });
      loadPosts();
    });

    $("btn-refresh").addEventListener("click", loadPosts);
    $("btn-publish").addEventListener("click", publish);
    $("btn-cancel").addEventListener("click", resetEditor);

    if (s.token) loadPosts();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
