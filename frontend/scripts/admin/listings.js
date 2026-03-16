import {
  DB,
  confirmDialog,
  money,
  notify,
  placeholderImg,
  readFileAsDataUrl,
} from "./core.js";

export function initListings({ maps }) {
  const postView = document.getElementById("postView");
  const listingsView = document.getElementById("listingsView");
  const list = document.getElementById("list");
  const empty = document.getElementById("empty");

  const editModal = document.getElementById("editModal");
  const editForm = document.getElementById("editForm");
  const eId = document.getElementById("eId");
  const eTitle = document.getElementById("eTitle");
  const ePrice = document.getElementById("ePrice");
  const eLocation = document.getElementById("eLocation");
  const eBedrooms = document.getElementById("eBedrooms");
  const eBaths = document.getElementById("eBaths");
  const eStatus = document.getElementById("eStatus");
  const eAddress = document.getElementById("eAddress");
  const eDescription = document.getElementById("eDescription");
  const ePhotoFile = document.getElementById("ePhotoFile");

  let allItems = [];

  async function getListings() {
    return window.API.listings.list();
  }

  function openPostView() {
    postView.style.display = "block";
    listingsView.style.display = "none";
    maps.showCreate();
  }

  function openManageView() {
    listingsView.style.display = "block";
    postView.style.display = "none";
    refresh();
  }

  function openEdit(item) {
    eId.value = item.id;
    eTitle.value = item.title || "";
    ePrice.value = item.price || 0;
    eLocation.value = item.city || "";
    eBedrooms.value = item.beds ?? 0;
    eBaths.value = item.baths ?? 0;
    eStatus.value = item.status || "available";
    eAddress.value = item.address || "";
    eDescription.value = item.description || "";
    ePhotoFile.value = "";
    document.getElementById("eLat").value = item.lat != null ? item.lat : "";
    document.getElementById("eLng").value = item.lng != null ? item.lng : "";
    editModal.classList.remove("hidden");
    maps.showEdit();
  }

  function render(items) {
    list.innerHTML = "";
    if (!items.length) {
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";

    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "card-item";

      const status = item.status || "available";
      const pill = document.createElement("span");
      pill.className = `badge pill ${status}`;
      pill.textContent = status === "rented" ? "Rented" : "Available";
      card.appendChild(pill);

      const img = document.createElement("img");
      img.className = "thumb";
      const photo = (Array.isArray(item.images) && item.images[0]) || item.photo || "";
      img.src = photo || placeholderImg();
      img.onerror = () => {
        img.src = placeholderImg();
      };
      card.appendChild(img);

      const body = document.createElement("div");
      const title = document.createElement("div");
      title.className = "title";
      title.textContent = item.title;
      body.appendChild(title);

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = `${money(item.price)} / mo \u2022 ${item.beds ?? 0} BR \u2022 ${
        item.baths ?? 0
      } BA \u2022 ${item.city || "Unknown"}`;
      body.appendChild(meta);

      if (item.description) {
        const description = document.createElement("div");
        description.textContent = item.description;
        body.appendChild(description);
      }

      const actions = document.createElement("div");
      actions.className = "actions-inline";

      const editButton = document.createElement("button");
      editButton.className = "btn btn-ghost";
      editButton.textContent = "Edit";
      editButton.onclick = () => openEdit(item);
      actions.appendChild(editButton);

      const deleteButton = document.createElement("button");
      deleteButton.className = "btn btn-danger";
      deleteButton.textContent = "Delete";
      deleteButton.onclick = async () => {
        try {
          const confirmed = await confirmDialog("Delete this listing?");
          if (!confirmed) return;
          await window.API.listings.remove(item.id);
          refresh();
        } catch {
          notify("Delete failed");
        }
      };
      actions.appendChild(deleteButton);

      body.appendChild(actions);
      card.appendChild(body);
      list.appendChild(card);
    });
  }

  function applySearch() {
    const query = (document.getElementById("adminSearch")?.value || "")
      .trim()
      .toLowerCase();

    if (!query) {
      render(allItems);
      return;
    }

    const filtered = allItems.filter((item) => {
      const title = (item.title || "").toLowerCase();
      const city = (item.city || "").toLowerCase();
      const description = (item.description || "").toLowerCase();
      return (
        title.includes(query) ||
        city.includes(query) ||
        description.includes(query)
      );
    });
    render(filtered);
  }

  async function refresh() {
    try {
      const items = await getListings();
      items.sort(
        (a, b) =>
          new Date(b.created_at || b.createdAt) -
          new Date(a.created_at || a.createdAt)
      );
      allItems = items;
      applySearch();
    } catch {
      allItems = [];
      render([]);
    }
  }

  document.getElementById("btnPost")?.addEventListener("click", openPostView);
  document.getElementById("btnManage")?.addEventListener("click", openManageView);

  const searchInput = document.getElementById("adminSearch");
  const searchClear = document.getElementById("adminSearchClear");
  if (searchInput) {
    let debounceTimer = null;
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(applySearch, 120);
    });
  }
  searchClear?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    applySearch();
  });

  document.getElementById("formCreate")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const session = DB.session();
    if (!session || !session.token) {
      notify("Your session has expired. Please login again.", () => {
        window.location.href = "../index.html";
      });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const values = Object.fromEntries(formData.entries());
    const file = document.getElementById("photoFile").files[0];
    let photo = "";

    if (file) {
      if (file.size > 4.5 * 1024 * 1024) {
        notify("Image is too large. Please choose a file under 4.5 MB.");
        return;
      }
      photo = await readFileAsDataUrl(file);
    }

    const payload = {
      title: values.title,
      description: values.description,
      price: Number(values.price),
      beds: Number(values.bedrooms || 0),
      baths: 0,
      city: values.location || "",
      address: "",
      lat: document.getElementById("latCreate").value
        ? Number(document.getElementById("latCreate").value)
        : null,
      lng: document.getElementById("lngCreate").value
        ? Number(document.getElementById("lngCreate").value)
        : null,
      status: "available",
      images: photo ? [photo] : [],
    };

    try {
      await window.API.listings.create(payload);
      event.target.reset();
      notify("Listing added successfully!");
      refresh();
    } catch (error) {
      notify(
        error?.message
          ? "Failed to add listing: " + error.message
          : "Failed to add listing."
      );
    }
  });

  document.getElementById("btnCancelEdit")?.addEventListener("click", () => {
    editModal.classList.add("hidden");
  });

  editForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = eId.value;
    const file = ePhotoFile.files && ePhotoFile.files[0];
    let newImages = null;

    if (file) {
      if (file.size > 4.5 * 1024 * 1024) {
        alert("Image is too large. Please choose a file under 4.5 MB.");
        return;
      }
      newImages = [await readFileAsDataUrl(file)];
    }

    const payload = {
      title: eTitle.value.trim(),
      price: Number(ePrice.value),
      city: eLocation.value.trim(),
      beds: Number(eBedrooms.value || 0),
      baths: Number(eBaths.value || 0),
      status: eStatus.value,
      address: eAddress.value.trim(),
      description: eDescription.value.trim(),
      lat: document.getElementById("eLat").value
        ? Number(document.getElementById("eLat").value)
        : null,
      lng: document.getElementById("eLng").value
        ? Number(document.getElementById("eLng").value)
        : null,
    };

    if (newImages) {
      payload.images = newImages;
    }

    try {
      await window.API.listings.update(id, payload);
      editModal.classList.add("hidden");
      refresh();
    } catch (error) {
      notify(
        error?.message
          ? "Failed to update listing: " + error.message
          : "Failed to update listing."
      );
    }
  });

  return { refresh };
}
