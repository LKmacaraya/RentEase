import { DB, startApiHealthBadge } from "./admin/core.js";
import { initAdminChats } from "./admin/chat.js";
import { initListings } from "./admin/listings.js";
import { initMaps } from "./admin/maps.js";

// Stop here when the admin session is missing instead of letting later modules fail noisily.
DB.guard();

// Maps load first because listing forms depend on the location helpers they expose.
const maps = initMaps();
const listings = initListings({ maps });

document.getElementById("btnLogout")?.addEventListener("click", () => {
  localStorage.removeItem(DB.kSession);
  window.location.href = "../index.html";
});

// Bootstrap each live admin widget after the shell and auth state are ready.
startApiHealthBadge();
listings.refresh();
initAdminChats();
