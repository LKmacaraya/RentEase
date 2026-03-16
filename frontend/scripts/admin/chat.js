import { DB, notify, readFileAsDataUrl } from "./core.js";

const STICKERS = [
  "\uD83D\uDC4D",
  "\uD83D\uDE0A",
  "\u2764\uFE0F",
  "\uD83D\uDE22",
  "\uD83D\uDE2E",
];

function renderMessageContent(message) {
  if (message.deleted_at) {
    const text = document.createElement("div");
    text.className = "msg-text";
    text.textContent = "(message deleted)";
    return text;
  }

  if (message.kind === "image" || /^data:image\//.test(message.content)) {
    const image = document.createElement("img");
    image.className = "msg-image";
    image.src = message.content;
    return image;
  }

  if (message.kind === "sticker") {
    if (/^https?:\/\//.test(message.content) || /^data:image\//.test(message.content)) {
      const image = document.createElement("img");
      image.className = "msg-image";
      image.src = message.content;
      return image;
    }

    const sticker = document.createElement("div");
    sticker.className = "msg-text";
    sticker.style.fontSize = "24px";
    sticker.textContent = message.content;
    return sticker;
  }

  const text = document.createElement("div");
  text.className = "msg-text";
  text.textContent = message.content || "";
  return text;
}

function renderBubble(message, { onEdit, onDelete }) {
  const myId = DB.session()?.user?.id;
  const isMine = message.sender_id === myId;

  const wrap = document.createElement("div");
  wrap.className = "chat-msg" + (isMine ? " me" : "");

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.appendChild(renderMessageContent(message));

  const meta = document.createElement("div");
  meta.className = "msg-meta";
  meta.textContent =
    (message.sender_name || "User " + message.sender_id) +
    (message.edited_at ? " \u2022 edited" : "");
  bubble.appendChild(meta);

  const actions = document.createElement("div");
  actions.className = "msg-actions";
  if (isMine) {
    const editButton = document.createElement("button");
    editButton.className = "btn-icon";
    editButton.textContent = "Edit";
    editButton.onclick = () => onEdit(message);

    const deleteButton = document.createElement("button");
    deleteButton.className = "btn-icon";
    deleteButton.textContent = "Delete";
    deleteButton.onclick = () => onDelete(message);

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
  }

  bubble.appendChild(actions);
  wrap.appendChild(bubble);
  return wrap;
}

function mountComposerEnhancements({ sendButton, sendSticker, sendImage }) {
  const inputRow = sendButton?.parentElement;
  if (!inputRow) return;

  let pickerOpen = false;
  const imageButton = document.createElement("button");
  imageButton.type = "button";
  imageButton.className = "btn-icon";
  imageButton.textContent = "Image";

  const imageInput = document.createElement("input");
  imageInput.type = "file";
  imageInput.accept = "image/*";
  imageInput.style.display = "none";

  const stickerButton = document.createElement("button");
  stickerButton.type = "button";
  stickerButton.className = "btn-icon";
  stickerButton.textContent = "Stickers";

  const picker = document.createElement("div");
  picker.className = "sticker-picker";
  picker.style.display = "none";

  const grid = document.createElement("div");
  grid.className = "sticker-grid";
  STICKERS.forEach((sticker) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = sticker;
    button.onclick = async () => {
      try {
        await sendSticker(sticker);
        pickerOpen = false;
        picker.style.display = "none";
      } catch {
        notify("Failed to send.");
      }
    };
    grid.appendChild(button);
  });

  picker.appendChild(grid);
  inputRow.parentElement.appendChild(picker);
  inputRow.appendChild(sendButton);
  inputRow.appendChild(stickerButton);
  inputRow.appendChild(imageButton);
  inputRow.appendChild(imageInput);

  imageButton.onclick = () => imageInput.click();
  stickerButton.onclick = () => {
    pickerOpen = !pickerOpen;
    picker.style.display = pickerOpen ? "block" : "none";
  };

  imageInput.onchange = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (file.size > 4.5 * 1024 * 1024) {
      notify("Image is too large. Max 4.5MB");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      await sendImage(String(dataUrl));
      imageInput.value = "";
    } catch {
      notify("Failed to send.");
    }
  };
}

export function initAdminChats() {
  const publicList = document.getElementById("pubAList");
  const publicInput = document.getElementById("pubAInput");
  const publicSend = document.getElementById("pubASend");

  const threadsList = document.getElementById("threadsList");
  const privateList = document.getElementById("privAList");
  const privateInput = document.getElementById("privAInput");
  const privateSend = document.getElementById("privASend");

  let publicAfterId = 0;
  let publicTimer = null;
  let currentOtherId = null;
  let currentListingId = null;
  let privateAfterId = 0;
  let privateTimer = null;
  let threadTimer = null;

  function appendPublic(message) {
    publicList.appendChild(
      renderBubble(message, {
        onEdit: async (item) => {
          const value = prompt("Edit message", item.content || "");
          if (value == null || !value.trim()) return;
          try {
            await window.API.chat.public.update(item.id, value.trim());
            publicAfterId = 0;
            publicList.innerHTML = "";
          } catch {
            notify("Failed to edit.");
          }
        },
        onDelete: async (item) => {
          try {
            await window.API.chat.public.remove(item.id);
            publicAfterId = 0;
            publicList.innerHTML = "";
          } catch {
            notify("Failed to delete.");
          }
        },
      })
    );
    publicList.scrollTop = publicList.scrollHeight;
  }

  function appendPrivate(message) {
    privateList.appendChild(
      renderBubble(message, {
        onEdit: async (item) => {
          const value = prompt("Edit message", item.content || "");
          if (value == null || !value.trim()) return;
          try {
            await window.API.chat.private.update(item.id, value.trim());
            privateAfterId = 0;
            privateList.innerHTML = "";
          } catch {
            notify("Failed to edit.");
          }
        },
        onDelete: async (item) => {
          try {
            await window.API.chat.private.remove(item.id);
            privateAfterId = 0;
            privateList.innerHTML = "";
          } catch {
            notify("Failed to delete.");
          }
        },
      })
    );
    privateList.scrollTop = privateList.scrollHeight;
  }

  async function pollPublic() {
    try {
      const items = await window.API.chat.public.list(publicAfterId);
      if (Array.isArray(items) && items.length) {
        items.forEach((message) => {
          appendPublic(message);
          publicAfterId = Math.max(publicAfterId, Number(message.id) || 0);
        });
      }
    } catch {
    } finally {
      publicTimer = setTimeout(pollPublic, 2000);
    }
  }

  async function pollPrivate() {
    if (!currentOtherId || !currentListingId) return;
    try {
      const items = await window.API.chat.private.list(
        currentListingId,
        currentOtherId,
        privateAfterId
      );
      if (Array.isArray(items) && items.length) {
        items.forEach((message) => {
          appendPrivate(message);
          privateAfterId = Math.max(privateAfterId, Number(message.id) || 0);
        });
      }
    } catch {
    } finally {
      privateTimer = setTimeout(pollPrivate, 2000);
    }
  }

  function selectThread(listingId, otherId) {
    currentListingId = listingId;
    currentOtherId = otherId;
    privateAfterId = 0;
    privateList.innerHTML = "";
    if (privateTimer) clearTimeout(privateTimer);
    privateTimer = setTimeout(pollPrivate, 80);
  }

  async function loadThreads() {
    try {
      const threads = await window.API.chat.private.threads();
      threadsList.innerHTML = "";
      (threads || []).forEach((thread) => {
        const item = document.createElement("div");
        item.className = "thread-card";

        const title = document.createElement("div");
        title.className = "thread-title";
        title.textContent =
          thread.listing_title || "Listing #" + thread.listing_id;

        const sub = document.createElement("div");
        sub.className = "thread-sub";
        sub.textContent = "From: " + (thread.other_name || "User " + thread.other_id);

        const snippet = document.createElement("div");
        snippet.className = "thread-snippet";
        snippet.textContent = thread.last_content || "";

        const meta = document.createElement("div");
        meta.className = "thread-meta";
        meta.textContent = thread.last_time
          ? new Date(thread.last_time).toLocaleString()
          : "";

        item.appendChild(title);
        item.appendChild(sub);
        item.appendChild(snippet);
        item.appendChild(meta);
        item.onclick = () => selectThread(thread.listing_id, thread.other_id);
        threadsList.appendChild(item);
      });
    } catch {
    }
  }

  function startThreads() {
    if (threadTimer) clearTimeout(threadTimer);
    async function tick() {
      try {
        await loadThreads();
      } finally {
        threadTimer = setTimeout(tick, 5000);
      }
    }
    threadTimer = setTimeout(tick, 100);
  }

  publicSend?.addEventListener("click", async () => {
    const text = (publicInput.value || "").trim();
    if (!text) return;
    try {
      const message = await window.API.chat.public.send(text, "text");
      publicInput.value = "";
      appendPublic({
        id: message.id,
        sender_id: DB.session()?.user?.id,
        sender_name: DB.session()?.user?.name,
        content: text,
        kind: "text",
      });
      publicAfterId = Math.max(publicAfterId, Number(message.id) || 0);
    } catch {
      notify("Failed to send.");
    }
  });

  privateSend?.addEventListener("click", async () => {
    const text = (privateInput.value || "").trim();
    if (!text || !currentOtherId || !currentListingId) return;
    try {
      const message = await window.API.chat.private.send(
        currentListingId,
        currentOtherId,
        text
      );
      privateInput.value = "";
      appendPrivate({
        id: message.id,
        sender_id: DB.session()?.user?.id,
        sender_name: DB.session()?.user?.name,
        content: text,
      });
      privateAfterId = Math.max(privateAfterId, Number(message.id) || 0);
    } catch {
      notify("Failed to send.");
    }
  });

  mountComposerEnhancements({
    sendButton: publicSend,
    sendSticker: (sticker) => window.API.chat.public.send(sticker, "sticker"),
    sendImage: (dataUrl) => window.API.chat.public.send(dataUrl, "image"),
  });

  publicTimer = setTimeout(pollPublic, 80);
  startThreads();
}
