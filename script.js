const weeksContainer = document.querySelector("#weeks");
const template = document.querySelector("#week-template");
const addWeekButton = document.querySelector("#add-week");
const saveNotesButton = document.querySelector("#save-notes");
const downloadWebsiteButton = document.querySelector("#download-website");
const saveStatus = document.querySelector("#save-status");
const imageInput = document.querySelector("#image-input");
const commentsList = document.querySelector("#comments-list");
const readMoreList = document.querySelector("#read-more-list");
const papersList = document.querySelector("#papers-list");
const saveGuide = document.querySelector("#save-guide");
const exportedFilename = document.querySelector("#exported-filename");
const documentTitle = document.querySelector("#document-title");
const documentSubtitle = document.querySelector("#document-subtitle");
const startingNumber = document.querySelector("#starting-number");
const meetingNavigator = document.querySelector("#meeting-navigator");
const meetingNumberInput = document.querySelector("#meeting-number-input");
const meetingNavigationError = document.querySelector(
  "#meeting-navigation-error"
);

const storageKey = "reusable-weekly-notes-template-v1";

let activeEditor = null;
let saveTimer;
let savedRange = null;
let selectedImage = null;

function rememberSelection() {
  const selection = window.getSelection();

  if (
    activeEditor &&
    selection.rangeCount &&
    activeEditor.contains(selection.anchorNode)
  ) {
    savedRange = selection.getRangeAt(0).cloneRange();
  }
}

document.addEventListener("selectionchange", rememberSelection);

function restoreSelection() {
  if (!savedRange) {
    return false;
  }

  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(savedRange);

  return true;
}

function renumberMeetings() {
  const firstNumber = Number.parseInt(startingNumber.value, 10) || 0;

  document.querySelectorAll(".meeting-number").forEach((number, index) => {
    number.textContent = firstNumber + index;
  });
}

function save() {
  const meetings = [...document.querySelectorAll(".week")].map((week) => ({
    date: week.querySelector(".meeting-date").value,
    notes: week.querySelector(".week-notes").innerHTML
  }));

  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        title: documentTitle.textContent.trim() || "Weekly Notes",
        subtitle: documentSubtitle.textContent.trim() || "Weekly journal",
        startNumber: Number.parseInt(startingNumber.value, 10) || 0,
        meetings
      })
    );

    saveStatus.textContent = "Saved";
  } catch (error) {
    saveStatus.textContent =
      "Could not save—an inserted image may be too large";
  }
}

function scheduleSave() {
  saveStatus.textContent = "Saving…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 350);
}

[documentTitle, documentSubtitle].forEach((title) => {
  title.addEventListener("input", () => {
    if (title === documentTitle) {
      document.title = title.textContent.trim() || "Weekly Notes";
    }

    scheduleSave();
  });
});

startingNumber.addEventListener("input", () => {
  renumberMeetings();
  scheduleSave();
});

saveNotesButton.addEventListener("click", () => {
  clearTimeout(saveTimer);
  save();
  saveStatus.textContent = "All notes saved";
});

function connectWeek(week) {
  const editor = week.querySelector(".week-notes");

  editor.addEventListener("focus", () => {
    activeEditor = editor;
  });

  editor.addEventListener("keyup", rememberSelection);
  editor.addEventListener("mouseup", rememberSelection);

  editor.addEventListener("input", () => {
    scheduleSave();
    renderReferenceLists();
  });

  editor.addEventListener("change", (event) => {
    if (event.target.matches('.checklist input[type="checkbox"]')) {
      event.target.toggleAttribute("checked", event.target.checked);
      scheduleSave();
    }
  });

  editor.addEventListener("paste", handleImagePaste);

  editor.addEventListener("click", (event) => {
    document.querySelectorAll(".selected-image").forEach((image) => {
      image.classList.remove("selected-image");
    });

    selectedImage = event.target.closest("img");

    const sizeControl = document.querySelector("#image-size");
    sizeControl.disabled = !selectedImage;

    if (selectedImage) {
      selectedImage.classList.add("selected-image");
      sizeControl.value = selectedImage.style.width || "100%";
    }
  });

  week
    .querySelector(".meeting-date")
    .addEventListener("input", scheduleSave);

  week
    .querySelector(".save-copy")
    .addEventListener("click", () => exportMeeting(week));
}

function escapeHTML(value) {
  return value.replace(/[&<>"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  })[character]);
}

function getEmbeddedStyles() {
  return [...document.styleSheets]
    .map((sheet) => {
      try {
        return [...sheet.cssRules]
          .map((rule) => rule.cssText)
          .join("\n");
      } catch (error) {
        return "";
      }
    })
    .join("\n");
}

function safeFilename(value) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "weekly-notes"
  );
}

function downloadCompleteWebsite() {
  clearTimeout(saveTimer);
  save();
  renderComments();
  renderReferenceLists();

  const snapshot = document.documentElement.cloneNode(true);

  snapshot
    .querySelectorAll(
      "script, link[rel='stylesheet'], template, dialog, " +
      ".editor-toolbar, .page-actions, .navigation-panel"
    )
    .forEach((element) => element.remove());

  snapshot.querySelectorAll("[contenteditable]").forEach((element) => {
    element.removeAttribute("contenteditable");
  });

  snapshot.querySelectorAll(".delete-comment").forEach((element) => {
    element.remove();
  });

  snapshot.querySelectorAll(".selected-image, .is-active").forEach((element) => {
    element.classList.remove("selected-image", "is-active");
  });

  snapshot.querySelectorAll(".meeting-date").forEach((input) => {
    const date = document.createElement("time");

    date.className = "exported-date";
    date.textContent = input.value || "No date";

    if (input.value) {
      date.dateTime = input.value;
    }

    input.replaceWith(date);
  });

  snapshot.querySelectorAll(".save-copy").forEach((button) => {
    button.remove();
  });

  const style = document.createElement("style");

  style.textContent = `
    ${getEmbeddedStyles()}

    body {
      background: #fff;
    }

    .document {
      width: min(980px, calc(100% - 32px));
      margin: 0 auto;
      box-shadow: none;
    }

    .comments-panel {
      position: static;
      width: auto;
      max-height: none;
      margin-top: 24px;
      overflow: visible;
      box-shadow: none;
    }

    .exported-date {
      color: #5c4d43;
      font-size: 0.85rem;
    }

    .template-credit {
      display: block;
    }
  `;

  snapshot.querySelector("head").append(style);

  const title = documentTitle.textContent.trim() || "Weekly Notes";

  snapshot.querySelector("title").textContent =
    `${title} — Complete Backup`;

  const fileContents = `<!DOCTYPE html>\n${snapshot.outerHTML}`;

  const blob = new Blob(
    [fileContents],
    { type: "text/html;charset=utf-8" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStamp = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download =
    `${safeFilename(title)}-complete-${dateStamp}.html`;

  document.body.append(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);

  saveStatus.textContent = "Complete website downloaded";
}

downloadWebsiteButton.addEventListener(
  "click",
  downloadCompleteWebsite
);

function exportMeeting(week) {
  save();

  const number =
    week.querySelector(".meeting-number").textContent;

  const date =
    week.querySelector(".meeting-date").value || "undated";

  const notes =
    week.querySelector(".week-notes").innerHTML;

  const filename = `meeting-${number}-${date}.html`;

  const documentCopy = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHTML(documentTitle.textContent.trim())} — Meeting ${escapeHTML(number)}</title>
<style>
body {
  max-width: 820px;
  margin: 60px auto;
  padding: 0 30px;
  color: #29231f;
  font: 17px/1.75 Georgia, serif;
}
h1 {
  padding-bottom: 18px;
  border-bottom: 3px solid #d96b32;
  color: #b84d22;
  font: 500 30px/1.2 Georgia, serif;
}
h2 {
  color: #c75b2a;
  font: 700 15px/1.3 Arial, sans-serif;
  letter-spacing: .05em;
}
img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 20px auto;
  border-radius: 8px;
}
.comment-highlight {
  border-bottom: 2px dotted #c75b2a;
  background: #fff1e8;
}
.read-more-mark {
  padding: 1px 4px;
  border-radius: 4px;
  background: #ffe3d3;
  color: #a9441e;
}
.read-more-mark::after {
  content: " ↗ should read more";
  font: 700 11px Arial, sans-serif;
}
.paper-mark {
  padding: 1px 4px;
  border-radius: 4px;
  background: #eee4fa;
  color: #684d82;
}
.paper-mark::after {
  content: " ▤ paper";
  color: #80639b;
  font: 700 11px Arial, sans-serif;
}
.quote-mark {
  padding: 1px 4px;
  border-bottom: 2px solid #999;
  border-radius: 4px;
  background: #eee;
  color: #555;
}
.quote-mark::after {
  content: " ❝ quote";
  color: #777;
  font: 700 11px Arial, sans-serif;
}
li {
  margin-bottom: 6px;
}
@media print {
  body {
    margin: 25mm auto;
  }
}
</style>
</head>
<body>
<h1>${escapeHTML(documentTitle.textContent.trim())}</h1>
<h2>Meeting #${escapeHTML(number)} · ${escapeHTML(date)}</h2>
${notes}
</body>
</html>`;

  const blob = new Blob(
    [documentCopy],
    { type: "text/html;charset=utf-8" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);

  exportedFilename.textContent = filename;
  saveGuide.showModal();
}

document.querySelector("#close-guide").addEventListener("click", () => {
  saveGuide.close();
});

saveGuide.addEventListener("click", (event) => {
  if (event.target === saveGuide) {
    saveGuide.close();
  }
});

function addWeek(data = {}) {
  const week = template.content.firstElementChild.cloneNode(true);

  week.querySelector(".meeting-date").value =
    data.date || "";

  week.querySelector(".week-notes").innerHTML =
    data.notes || "<p><br></p>";

  weeksContainer.append(week);

  connectWeek(week);
  renumberMeetings();

  return week;
}

document.querySelectorAll(".week").forEach(connectWeek);

document.querySelectorAll("[data-command]").forEach((button) => {
  button.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  button.addEventListener("click", () => {
    if (!activeEditor) {
      return;
    }

    activeEditor.focus();

    document.execCommand(
      button.dataset.command,
      false
    );

    scheduleSave();
  });
});

function applyCommand(command, value = null) {
  if (!activeEditor) {
    return;
  }

  activeEditor.focus();

  if (!restoreSelection()) {
    return;
  }

  document.execCommand(command, false, value);

  rememberSelection();
  scheduleSave();
}

document.querySelector("#font-size").addEventListener(
  "change",
  (event) => {
    applyCommand("fontSize", event.target.value);
  }
);

function applyInlineStyle(property, value) {
  if (!activeEditor || !restoreSelection()) {
    return;
  }

  const selection = window.getSelection();

  if (selection.isCollapsed) {
    return;
  }

  const range = selection.getRangeAt(0);
  const span = document.createElement("span");

  span.style[property] = value;

  try {
    range.surroundContents(span);
  } catch (error) {
    span.append(range.extractContents());
    range.insertNode(span);
  }

  selection.removeAllRanges();
  selection.selectAllChildren(span);

  rememberSelection();
  scheduleSave();
}

document
  .querySelector("#apply-text-color")
  .addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

document
  .querySelector("#apply-text-color")
  .addEventListener("click", () => {
    applyInlineStyle(
      "color",
      document.querySelector("#text-color").value
    );
  });

document
  .querySelector("#apply-highlight")
  .addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

document
  .querySelector("#apply-highlight")
  .addEventListener("click", () => {
    applyInlineStyle(
      "backgroundColor",
      document.querySelector("#highlight-color").value
    );
  });

document
  .querySelector("#insert-break")
  .addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

document
  .querySelector("#insert-break")
  .addEventListener("click", () => {
    if (!activeEditor || !restoreSelection()) {
      alert("Click where you want to insert the dotted break first.");
      return;
    }

    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const divider = document.createElement("hr");

    range.deleteContents();

    divider.className = "paragraph-break";
    range.insertNode(divider);

    range.setStartAfter(divider);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);

    rememberSelection();
    scheduleSave();
  });

document.querySelector("#image-size").addEventListener(
  "change",
  (event) => {
    if (!selectedImage) {
      return;
    }

    selectedImage.style.width = event.target.value;
    selectedImage.style.maxWidth = "100%";

    scheduleSave();
  }
);

function wrapSelection(className, attributes = {}) {
  if (!restoreSelection()) {
    return null;
  }

  const selection = window.getSelection();

  if (selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const span = document.createElement("span");

  span.className = className;

  Object.entries(attributes).forEach(([name, value]) => {
    span.dataset[name] = value;
  });

  try {
    range.surroundContents(span);
  } catch (error) {
    span.append(range.extractContents());
    range.insertNode(span);
  }

  selection.removeAllRanges();
  selection.selectAllChildren(span);

  rememberSelection();
  scheduleSave();

  return span;
}

document
  .querySelector("#add-checklist")
  .addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

document
  .querySelector("#add-checklist")
  .addEventListener("click", () => {
    if (!activeEditor || !restoreSelection()) {
      alert(
        "Click in the notes or select lines for the checklist first."
      );
      return;
    }

    const selection = window.getSelection();
    const range = selection.getRangeAt(0);

    const lines = selection
      .toString()
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      lines.push("");
    }

    const list = document.createElement("ul");
    list.className = "checklist";

    lines.forEach((line) => {
      const item = document.createElement("li");
      const checkbox = document.createElement("input");
      const text = document.createElement("span");

      checkbox.type = "checkbox";
      text.textContent = line || "Checklist item";

      item.append(checkbox, text);
      list.append(item);
    });

    range.deleteContents();
    range.insertNode(list);
    range.setStartAfter(list);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);

    rememberSelection();
    scheduleSave();
  });

document.querySelector("#add-comment").addEventListener("click", () => {
  if (!savedRange || savedRange.collapsed) {
    alert("Select the text you want to comment on first.");
    return;
  }

  const comment = prompt("Write your comment:");

  if (!comment) {
    return;
  }

  wrapSelection("comment-highlight", {
    comment,
    commentId: crypto.randomUUID()
  });

  renderComments();
});

document.querySelector("#read-more").addEventListener("click", () => {
  if (!savedRange || savedRange.collapsed) {
    alert("Select a topic or sentence first.");
    return;
  }

  wrapSelection("read-more-mark", {
    referenceId: crypto.randomUUID()
  });

  renderReferenceLists();
});

document.querySelector("#add-paper").addEventListener("click", () => {
  if (!savedRange || savedRange.collapsed) {
    alert("Select the paper title or citation first.");
    return;
  }

  wrapSelection("paper-mark", {
    referenceId: crypto.randomUUID()
  });

  renderReferenceLists();
});

document.querySelector("#add-quote").addEventListener("click", () => {
  if (!savedRange || savedRange.collapsed) {
    alert("Select the quoted text first.");
    return;
  }

  wrapSelection("quote-mark");
});

function renderComments() {
  const comments = [
    ...document.querySelectorAll(".comment-highlight")
  ];

  commentsList.innerHTML = "";

  if (!comments.length) {
    commentsList.innerHTML =
      '<p class="no-comments">No comments yet.</p>';
    return;
  }

  comments.forEach((highlight) => {
    if (!highlight.dataset.commentId) {
      highlight.dataset.commentId = crypto.randomUUID();
    }

    highlight.title = highlight.dataset.comment;

    const item = document.createElement("div");

    item.className = "comment-item";
    item.id = `comment-${highlight.dataset.commentId}`;

    item.innerHTML = `
      <p class="comment-quote"></p>
      <p class="comment-text"></p>
      <button class="delete-comment" type="button">Remove</button>
    `;

    item.querySelector(".comment-quote").textContent =
      `“${highlight.textContent}”`;

    const commentText = item.querySelector(".comment-text");

    commentText.textContent = highlight.dataset.comment;
    commentText.contentEditable = "true";
    commentText.setAttribute("role", "textbox");
    commentText.setAttribute("aria-label", "Edit comment");

    commentText.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    commentText.addEventListener("input", () => {
      highlight.dataset.comment = commentText.textContent.trim();
      highlight.title = highlight.dataset.comment;
      scheduleSave();
    });

    highlight.setAttribute("role", "button");
    highlight.setAttribute("tabindex", "0");

    const showComment = () => {
      document
        .querySelectorAll(".comment-item, .comment-highlight")
        .forEach((element) => {
          element.classList.remove("is-active");
        });

      highlight.classList.add("is-active");
      item.classList.add("is-active");

      item.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    };

    highlight.addEventListener("click", showComment);

    highlight.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showComment();
      }
    });

    item.addEventListener("click", (event) => {
      if (event.target.closest(".delete-comment")) {
        return;
      }

      document
        .querySelectorAll(".comment-item, .comment-highlight")
        .forEach((element) => {
          element.classList.remove("is-active");
        });

      item.classList.add("is-active");
      highlight.classList.add("is-active");

      highlight.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    });

    item
      .querySelector(".delete-comment")
      .addEventListener("click", () => {
        highlight.replaceWith(...highlight.childNodes);
        renderComments();
        scheduleSave();
      });

    commentsList.append(item);
  });
}

function renderReferenceList(container, selector, emptyMessage) {
  const markers = [...document.querySelectorAll(selector)];

  container.innerHTML = "";

  if (!markers.length) {
    container.innerHTML =
      `<p class="no-comments">${emptyMessage}</p>`;
    return;
  }

  markers.forEach((marker) => {
    if (!marker.dataset.referenceId) {
      marker.dataset.referenceId = crypto.randomUUID();
    }

    const item = document.createElement("button");

    item.type = "button";
    item.className = "reference-item";
    item.textContent = marker.textContent.trim();

    item.addEventListener("click", () => {
      marker.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      marker.classList.add("is-active");

      setTimeout(() => {
        marker.classList.remove("is-active");
      }, 1400);
    });

    container.append(item);
  });
}

function renderReferenceLists() {
  renderReferenceList(
    readMoreList,
    ".read-more-mark",
    "Nothing marked to read more yet."
  );

  renderReferenceList(
    papersList,
    ".paper-mark",
    "No papers marked yet."
  );
}

document.querySelector("#go-read-more").addEventListener("click", () => {
  document.querySelector("#read-more-section").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});

document.querySelector("#go-papers").addEventListener("click", () => {
  document.querySelector("#papers-section").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});

function goToMeeting(answer) {
  const weeks = [...document.querySelectorAll(".week")];
  const cleaned = String(answer).trim().toLowerCase();

  const target =
    cleaned === "latest"
      ? weeks.at(-1)
      : weeks.find((week) => (
          week.querySelector(".meeting-number").textContent ===
          cleaned.replace(/^#/, "")
        ));

  if (!target) {
    meetingNavigationError.textContent =
      "That meeting could not be found.";
    return;
  }

  meetingNavigator.close();

  target.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  target.querySelector(".week-notes").focus();
}

document.querySelector("#go-meeting").addEventListener("click", () => {
  meetingNavigationError.textContent = "";
  meetingNumberInput.value = "";
  meetingNavigator.showModal();
});

document
  .querySelector("#go-latest-meeting")
  .addEventListener("click", () => {
    goToMeeting("latest");
  });

document
  .querySelector("#go-numbered-meeting")
  .addEventListener("click", () => {
    goToMeeting(meetingNumberInput.value);
  });

meetingNumberInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    goToMeeting(meetingNumberInput.value);
  }
});

document
  .querySelector("#close-meeting-navigator")
  .addEventListener("click", () => {
    meetingNavigator.close();
  });

function insertImage(file) {
  if (
    !file ||
    !file.type.startsWith("image/") ||
    !activeEditor
  ) {
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    if (!restoreSelection()) {
      activeEditor.focus();

      const selection = window.getSelection();
      const fallbackRange = document.createRange();

      fallbackRange.selectNodeContents(activeEditor);
      fallbackRange.collapse(false);

      selection.removeAllRanges();
      selection.addRange(fallbackRange);
    }

    const image = document.createElement("img");

    image.src = reader.result;
    image.alt = file.name || "Inserted image";
    image.style.width = "100%";

    const selection = window.getSelection();
    const range = selection.getRangeAt(0);

    range.deleteContents();
    range.insertNode(image);
    range.setStartAfter(image);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);

    rememberSelection();
    scheduleSave();
  };

  reader.readAsDataURL(file);
}

function handleImagePaste(event) {
  const image = [...event.clipboardData.items].find((item) => (
    item.type.startsWith("image/")
  ));

  if (!image) {
    return;
  }

  event.preventDefault();
  rememberSelection();
  insertImage(image.getAsFile());
}

document.querySelector("#add-image").addEventListener("click", () => {
  if (!activeEditor) {
    alert(
      "Click in a meeting note where you want the image first."
    );
    return;
  }

  imageInput.click();
});

imageInput.addEventListener("change", () => {
  insertImage(imageInput.files[0]);
  imageInput.value = "";
});

addWeekButton.addEventListener("click", () => {
  const week = addWeek();

  save();

  week.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  week.querySelector(".meeting-date").focus();
});

let savedDocument = null;

try {
  savedDocument = JSON.parse(
    localStorage.getItem(storageKey) || "null"
  );
} catch (error) {
  saveStatus.textContent = "Saved browser data could not be loaded";
}

if (savedDocument) {
  documentTitle.textContent =
    savedDocument.title || "Weekly Notes";

  documentSubtitle.textContent =
    savedDocument.subtitle || "Weekly journal";

  startingNumber.value =
    savedDocument.startNumber ?? 0;

  document.title = documentTitle.textContent;

  weeksContainer.replaceChildren();

  (savedDocument.meetings || []).forEach(addWeek);
}

renumberMeetings();
renderComments();
renderReferenceLists();
