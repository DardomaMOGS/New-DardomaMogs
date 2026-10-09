"use strict";

/* =========================================================
   DardomaMOGS — store frontend
   GitHub Pages + Google Apps Script + Google Sheets
   ========================================================= */

const CONFIG = Object.freeze({
  // Paste your deployed Apps Script Web App URL here, ending in /exec.
  API_URL: "https://script.google.com/macros/s/AKfycby9GyMIelR3lAnmaAaJlPBWMKw8v_SdIDuc6ZT_useCESQCM-TyPvXVYPG-JTOkB5WAVg/exec",

  timeZone: "Africa/Cairo",
  openHour: 14,
  closeHour: 2,
  deliveryFee: 20,
  currency: "EGP",
  cartKey: "dardomamogs.cart.v2",
  maxQuantity: 99
});

const PRODUCTS = Object.freeze([
  {
    id: "mango",
    name: "Mango Dardoma",
    price: 10,
    description: "Sweet mango flavor",
    emoji: "🥭",
    image: "./images/mango.webp",
    kicker: "Sun-ripened"
  },
  {
    id: "karkade",
    name: "Karkade Dardoma",
    price: 10,
    description: "Bright, fruity hibiscus",
    emoji: "❤️",
    image: "./images/karkade.webp",
    kicker: "Ruby bright"
  },
  {
    id: "pepsi",
    name: "Pepsi Dardoma",
    price: 10,
    description: "A cool cola-inspired treat",
    emoji: "🥤",
    image: "./images/pepsi.webp",
    kicker: "Cool & fizzy"
  }
]);

const ORDER_STATUSES = Object.freeze([
  "Order Received",
  "Preparing",
  "Ready",
  "Out for Delivery",
  "Delivered"
]);

const $ = (id) => document.getElementById(id);
let cart = loadCart();
let submitting = false;
let toastTimeout = null;

function money(amount) {
  return `${Number(amount || 0).toLocaleString("en-US")} ${CONFIG.currency}`;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function getProduct(id) {
  return PRODUCTS.find((product) => product.id === id);
}

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONFIG.cartKey) || "[]");
    if (!Array.isArray(saved)) return [];
    return saved
      .filter((item) => getProduct(item.id))
      .map((item) => ({
        id: item.id,
        quantity: Math.max(1, Math.min(CONFIG.maxQuantity, Math.floor(Number(item.quantity) || 1)))
      }));
  } catch {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(CONFIG.cartKey, JSON.stringify(cart));
  } catch {
    showToast("Your browser couldn't save the bag. You can still continue for now.");
  }
}

function cartQuantity() {
  return cart.reduce((total, item) => total + item.quantity, 0);
}

function subtotal() {
  return cart.reduce((total, item) => {
    const product = getProduct(item.id);
    return total + (product ? product.price * item.quantity : 0);
  }, 0);
}

function deliveryFee() {
  return cart.length ? CONFIG.deliveryFee : 0;
}

function total() {
  return subtotal() + deliveryFee();
}

function getCairoHour() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CONFIG.timeZone,
    hour: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());

  return Number(parts.find((part) => part.type === "hour")?.value ?? 0);
}

function isStoreOpen() {
  const hour = getCairoHour();
  return hour >= CONFIG.openHour || hour < CONFIG.closeHour;
}

function updateStoreStatus() {
  const open = isStoreOpen();
  const status = $("storeStatus");
  const light = $("statusLight");

  status.textContent = open ? "We’re open — let’s make your day!" : "We’re taking a little freezer break.";
  status.classList.toggle("is-open", open);
  status.classList.toggle("is-closed", !open);
  light.classList.toggle("status-light-open", open);

  $("storeStatusDetail").textContent = "2:00 PM — 2:00 AM · Cairo time";
  $("cartHoursNote").textContent = open
    ? "The shop is open. You can send your order now."
    : "The shop is currently closed. You can browse, but checkout is available from 2:00 PM to 2:00 AM Cairo time.";

  $("checkoutOpen").disabled = !cart.length;
}

function renderProducts() {
  const grid = $("productGrid");

  grid.innerHTML = PRODUCTS.map((product) => `
    <article class="product-card" data-product="${product.id}">
      <div class="product-visual">
        <img
          src="${escapeHTML(product.image)}"
          alt="${escapeHTML(product.name)}"
          loading="lazy"
          onerror="this.hidden=true;this.nextElementSibling.hidden=false"
        >
        <span class="product-emoji" hidden aria-hidden="true">${product.emoji}</span>
      </div>
      <div class="product-card-body">
        <p class="product-kicker">${escapeHTML(product.kicker)}</p>
        <h3>${escapeHTML(product.name)}</h3>
        <p class="product-description">${escapeHTML(product.description)}</p>
        <div class="product-buy-row">
          <span class="product-price">${money(product.price)} <small>/ each</small></span>
          <button class="button button-primary add-button" type="button" data-add="${product.id}">
            Add to bag <span aria-hidden="true">+</span>
          </button>
        </div>
      </div>
    </article>
  `).join("");
}

function renderCart() {
  const count = cartQuantity();
  $("cartCount").textContent = String(count);
  $("drawerCount").textContent = String(count);
  $("cartSubtotal").textContent = money(subtotal());
  $("cartDelivery").textContent = money(deliveryFee());
  $("cartTotal").textContent = money(total());
  $("checkoutOpen").disabled = count === 0;

  if (!cart.length) {
    $("cartItems").innerHTML = `
      <div class="empty-cart">
        Your bag is taking a little nap.<br>Add a flavor to get started!
      </div>`;
  } else {
    $("cartItems").innerHTML = cart.map((item) => {
      const product = getProduct(item.id);
      if (!product) return "";

      return `
        <article class="cart-item" data-product="${product.id}">
          <div class="cart-item-art" aria-hidden="true">${product.emoji}</div>
          <div>
            <h3>${escapeHTML(product.name)}</h3>
            <p class="cart-item-price">${money(product.price)} each · ${money(product.price * item.quantity)}</p>
            <div class="quantity-controls" aria-label="Quantity for ${escapeHTML(product.name)}">
              <button type="button" data-quantity="${product.id}" data-change="-1" aria-label="Remove one ${escapeHTML(product.name)}">−</button>
              <span>${item.quantity}</span>
              <button type="button" data-quantity="${product.id}" data-change="1" aria-label="Add one ${escapeHTML(product.name)}" ${item.quantity >= CONFIG.maxQuantity ? "disabled" : ""}>+</button>
              <button type="button" class="remove-item" data-remove="${product.id}">Remove</button>
            </div>
          </div>
        </article>`;
    }).join("");
  }

  saveCart();
  updateStoreStatus();
}

function addToCart(id) {
  const product = getProduct(id);
  if (!product) return;

  const existing = cart.find((item) => item.id === id);
  if (existing) {
    if (existing.quantity >= CONFIG.maxQuantity) {
      showToast(`Maximum quantity is ${CONFIG.maxQuantity} per flavor.`);
      return;
    }
    existing.quantity += 1;
  } else {
    cart.push({ id, quantity: 1 });
  }

  renderCart();
  showToast(`${product.name} added to your bag!`);
}

function changeQuantity(id, change) {
  const item = cart.find((entry) => entry.id === id);
  if (!item) return;

  item.quantity += change;
  if (item.quantity <= 0) cart = cart.filter((entry) => entry.id !== id);
  if (item.quantity > CONFIG.maxQuantity) item.quantity = CONFIG.maxQuantity;

  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter((item) => item.id !== id);
  renderCart();
  showToast("Removed from your bag.");
}

function openCart() {
  const drawer = $("cartDrawer");
  $("drawerBackdrop").hidden = false;
  drawer.inert = false;
  drawer.setAttribute("aria-hidden", "false");
  drawer.classList.add("is-open");
  $("cartOpen").setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
  $("cartClose").focus();
}

function closeCart() {
  const drawer = $("cartDrawer");
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  drawer.inert = true;
  $("drawerBackdrop").hidden = true;
  $("cartOpen").setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
  $("cartOpen").focus();
}

function openCheckout() {
  if (!cart.length) {
    showToast("Add a flavor to your bag first.");
    return;
  }

  if (!isStoreOpen()) {
    showToast("The shop is closed. Checkout opens at 2:00 PM Cairo time.");
    return;
  }

  if (!CONFIG.API_URL || !CONFIG.API_URL.endsWith("/exec")) {
    showCheckoutError("The shop connection isn't configured yet. Add the deployed Apps Script /exec URL in script.js.");
    return;
  }

  closeCart();
  $("checkoutError").hidden = true;
  $("checkoutFields").hidden = false;
  $("reviewPanel").hidden = true;
  $("checkoutDialog").showModal();
  $("customerName").focus();
}

function closeCheckout() {
  if ($("checkoutDialog").open) $("checkoutDialog").close();
}

function showCheckoutError(message) {
  const error = $("checkoutError");
  error.textContent = message;
  error.hidden = false;
}

function validateCheckout() {
  const name = $("customerName").value.trim();
  const contact = $("customerContact").value.trim();
  const notes = $("orderNotes").value.trim();

  if (name.length < 2) return "Please enter your name.";
  if (!contact || contact.length < 5) return "Please enter a valid contact number or email.";
  if (notes.length > 1000) return "Your note is too long.";
  if (!cart.length) return "Your bag is empty.";
  if (!isStoreOpen()) return "The shop is currently closed. Please order between 2:00 PM and 2:00 AM Cairo time.";

  return "";
}

function selectedPaymentMethod() {
  return document.querySelector('input[name="paymentMethod"]:checked')?.value || "InstaPay";
}

function buildOrderPayload() {
  return {
    requestId: createRequestId(),
    name: $("customerName").value.trim(),
    contact: $("customerContact").value.trim(),
    notes: $("orderNotes").value.trim(),
    paymentMethod: selectedPaymentMethod(),
    items: cart.map((item) => ({ id: item.id, quantity: item.quantity }))
  };
}

function createRequestId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `dm_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
}

function showReview() {
  $("checkoutError").hidden = true;
  const error = validateCheckout();

  if (error) {
    showCheckoutError(error);
    return;
  }

  const lines = cart.map((item) => {
    const product = getProduct(item.id);
    return `
      <div class="review-line">
        <span>${escapeHTML(product.name)} × ${item.quantity}</span>
        <span>${money(product.price * item.quantity)}</span>
      </div>`;
  }).join("");

  $("reviewLines").innerHTML = `
    ${lines}
    <div class="review-line"><span>Subtotal</span><span>${money(subtotal())}</span></div>
    <div class="review-line"><span>Delivery</span><span>${money(deliveryFee())}</span></div>
    <div class="review-line"><span>Payment</span><span>${escapeHTML(selectedPaymentMethod())}</span></div>
    <div class="review-line total"><span>Total</span><span>${money(total())}</span></div>`;

  $("checkoutFields").hidden = true;
  $("reviewPanel").hidden = false;
  $("confirmOrder").disabled = false;
  $("confirmOrder").textContent = "Confirm order ✓";
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

/*
 * Sends the order through a hidden form/iframe to avoid relying on
 * cross-origin fetch permissions from GitHub Pages to Apps Script.
 */
function postOrder(payload) {
  return new Promise((resolve, reject) => {
    const frameName = `dardoma_submit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const iframe = document.createElement("iframe");
    const form = document.createElement("form");
    const payloadInput = document.createElement("input");
    let finished = false;

    iframe.name = frameName;
    iframe.title = "Order submission";
    iframe.hidden = true;

    form.method = "POST";
    form.action = CONFIG.API_URL;
    form.target = frameName;
    form.hidden = true;

    payloadInput.type = "hidden";
    payloadInput.name = "payload";
    payloadInput.value = JSON.stringify(payload);
    form.appendChild(payloadInput);

    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timeout);
      form.remove();
      iframe.remove();
    };

    const finish = (error, result) => {
      if (finished) return;
      finished = true;
      cleanup();
      error ? reject(error) : resolve(result);
    };

    const onMessage = (event) => {
      if (!isTrustedAppsScriptOrigin(event.origin)) return;
      const data = event.data;
      if (!data || data.type !== "DARDOMA_ORDER_RESULT") return;
      if (data.requestId && data.requestId !== payload.requestId) return;

      if (data.ok && data.orderNumber && data.trackingCode) {
        finish(null, data);
      } else {
        finish(new Error(data.message || "The shop couldn't accept the order. Please try again."));
      }
    };

    const timeout = setTimeout(() => {
      finish(new Error("The order confirmation timed out. Check your connection before trying again."));
    }, 30000);

    window.addEventListener("message", onMessage);
    document.body.append(iframe, form);

    try {
      form.submit();
    } catch (error) {
      finish(new Error("Couldn't send the order. Please try again."));
    }
  });
}

function isTrustedAppsScriptOrigin(origin) {
  try {
    const hostname = new URL(origin).hostname;
    return hostname === "script.google.com" ||
      hostname.endsWith(".script.google.com") ||
      hostname === "googleusercontent.com" ||
      hostname.endsWith(".googleusercontent.com");
  } catch {
    return false;
  }
}

async function submitOrder() {
  if (submitting) return;

  const error = validateCheckout();
  if (error) {
    showCheckoutError(error);
    $("checkoutFields").hidden = false;
    $("reviewPanel").hidden = true;
    return;
  }

  if (!CONFIG.API_URL || !CONFIG.API_URL.endsWith("/exec")) {
    showCheckoutError("The shop connection isn't configured yet. Add your Apps Script /exec URL in script.js.");
    return;
  }

  submitting = true;
  const button = $("confirmOrder");
  button.disabled = true;
  button.textContent = "Sending your order…";
  $("checkoutError").hidden = true;

  try {
    const payload = buildOrderPayload();
    const result = await postOrder(payload);

    $("checkoutDialog").close();
    $("confirmedOrderNumber").textContent = result.orderNumber;
    $("confirmedTrackingCode").textContent = result.trackingCode;
    $("confirmationTotal").textContent = `Order total: ${money(result.total)}`;

    // The cart is only cleared after the server confirms the order.
    cart = [];
    renderCart();

    $("confirmationDialog").showModal();
    $("confirmationClose").focus();
  } catch (error) {
    showCheckoutError(error.message || "Something went wrong. Please try again.");
    $("checkoutFields").hidden = false;
    $("reviewPanel").hidden = true;
  } finally {
    submitting = false;
    button.disabled = false;
    button.textContent = "Confirm order ✓";
  }
}

function showTrackingMessage(message, success = false) {
  const node = $("trackingMessage");
  node.textContent = message;
  node.hidden = false;
  node.classList.toggle("success", success);
}

function hideTrackingResult() {
  $("trackingResult").hidden = true;
  $("deliveryMap").hidden = true;
  $("mapFrame").removeAttribute("src");
}

function trackOrder(orderNumber, trackingCode) {
  return new Promise((resolve, reject) => {
    if (!CONFIG.API_URL || !CONFIG.API_URL.endsWith("/exec")) {
      reject(new Error("Order tracking isn't configured yet."));
      return;
    }

    const callback = `dardomaTrack_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const script = document.createElement("script");
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Tracking took too long. Please try again."));
    }, 15000);

    function cleanup() {
      clearTimeout(timeout);
      delete window[callback];
      script.remove();
    }

    window[callback] = (result) => {
      cleanup();
      if (result && result.ok) resolve(result);
      else reject(new Error(result?.message || "Order not found. Check both codes and try again."));
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Couldn't connect to the tracking service. Please try again."));
    };

    const url = new URL(CONFIG.API_URL);
    url.searchParams.set("action", "track");
    url.searchParams.set("orderNumber", orderNumber);
    url.searchParams.set("trackingCode", trackingCode);
    url.searchParams.set("callback", callback);

    script.src = url.toString();
    document.body.appendChild(script);
  });
}

function renderTracking(result) {
  const statusIndex = ORDER_STATUSES.indexOf(result.status);
  $("trackedOrderNumber").textContent = result.orderNumber;
  $("trackedStatus").textContent = result.status;
  $("statusSteps").innerHTML = ORDER_STATUSES.map((status, index) => `
    <li class="${index <= statusIndex ? "done" : ""}">${escapeHTML(status)}</li>
  `).join("");

  const created = result.createdAt ? new Date(result.createdAt) : null;
  $("trackedMeta").textContent =
    `Total: ${money(result.total)}${created && !Number.isNaN(created.getTime()) ? ` · Placed ${created.toLocaleString()}` : ""}`;

  const hasCoordinates = Number.isFinite(Number(result.latitude)) &&
    Number.isFinite(Number(result.longitude)) &&
    result.latitude !== "" && result.longitude !== "" &&
    Number(result.latitude) >= -90 && Number(result.latitude) <= 90 &&
    Number(result.longitude) >= -180 && Number(result.longitude) <= 180;

  if (result.status === "Out for Delivery" && hasCoordinates) {
    const lat = Number(result.latitude);
    const lng = Number(result.longitude);
    $("deliveryMap").hidden = false;
    $("mapFrame").src = `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
  } else {
    $("deliveryMap").hidden = true;
    $("mapFrame").removeAttribute("src");
  }

  $("trackingResult").hidden = false;
}

function closeConfirmation() {
  if ($("confirmationDialog").open) $("confirmationDialog").close();
}

function initEvents() {
  $("productGrid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-add]");
    if (button) addToCart(button.dataset.add);
  });

  $("cartItems").addEventListener("click", (event) => {
    const quantityButton = event.target.closest("[data-quantity]");
    const removeButton = event.target.closest("[data-remove]");

    if (quantityButton) {
      changeQuantity(quantityButton.dataset.quantity, Number(quantityButton.dataset.change));
    } else if (removeButton) {
      removeFromCart(removeButton.dataset.remove);
    }
  });

  $("cartOpen").addEventListener("click", openCart);
  $("cartClose").addEventListener("click", closeCart);
  $("drawerBackdrop").addEventListener("click", closeCart);

  $("clearCart").addEventListener("click", () => {
    cart = [];
    renderCart();
    showToast("Your bag is now empty.");
  });

  $("checkoutOpen").addEventListener("click", openCheckout);
  $("checkoutClose").addEventListener("click", closeCheckout);

  $("checkoutDialog").addEventListener("click", (event) => {
    if (event.target === $("checkoutDialog")) closeCheckout();
  });

  $("reviewOrder").addEventListener("click", showReview);

  $("editOrder").addEventListener("click", () => {
    $("reviewPanel").hidden = true;
    $("checkoutFields").hidden = false;
    $("checkoutError").hidden = true;
  });

  $("confirmOrder").addEventListener("click", submitOrder);
  $("confirmationClose").addEventListener("click", closeConfirmation);

  $("confirmationDialog").addEventListener("click", (event) => {
    if (event.target === $("confirmationDialog")) closeConfirmation();
  });

  $("followOrder").addEventListener("click", () => {
    const orderNumber = $("confirmedOrderNumber").textContent;
    const trackingCode = $("confirmedTrackingCode").textContent;
    closeConfirmation();
    $("trackOrder").value = orderNumber;
    $("trackCode").value = trackingCode;
    $("track").scrollIntoView({ behavior: "smooth" });
    $("trackCode").focus({ preventScroll: true });
    runTracking(orderNumber, trackingCode);
  });

  $("trackingForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const orderNumber = $("trackOrder").value.trim().toUpperCase();
    const trackingCode = $("trackCode").value.trim().toUpperCase();
    await runTracking(orderNumber, trackingCode);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && $("cartDrawer").classList.contains("is-open")) {
      closeCart();
    }
  });
}

async function runTracking(orderNumber, trackingCode) {
  $("trackingMessage").hidden = true;
  hideTrackingResult();

  if (!orderNumber || !trackingCode) {
    showTrackingMessage("Enter both your order number and private tracking code.");
    return;
  }

  showTrackingMessage("Looking for your order…");

  try {
    const result = await trackOrder(orderNumber, trackingCode);
    $("trackingMessage").hidden = true;
    renderTracking(result);
  } catch (error) {
    showTrackingMessage(error.message || "Couldn't find that order.");
  }
}

function init() {
  renderProducts();
  renderCart();
  updateStoreStatus();
  initEvents();

  // Refresh the open/closed label as time changes.
  window.setInterval(updateStoreStatus, 60 * 1000);
}

document.addEventListener("DOMContentLoaded", init);
