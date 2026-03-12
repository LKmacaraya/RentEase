import { DB, startApiHealthBadge } from "./admin/core.js";
import { initAdminChats } from "./admin/chat.js";
import { initListings } from "./admin/listings.js";
import { initMaps } from "./admin/maps.js";

DB.guard();

const maps = initMaps();
const listings = initListings({ maps });

document.getElementById("btnLogout")?.addEventListener("click", () => {
  localStorage.removeItem(DB.kSession);
  window.location.href = "../index.html";
});

startApiHealthBadge();
listings.refresh();
initAdminChats();
