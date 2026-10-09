'use strict';

const PRODUCTS = [
  { id: 'mango', name: 'Mango Dardoma', emoji: '🥭', price: 10, note: 'Sun-ripened & golden', badge: 'THE SUNNY ONE', image: '/manus-storage/async-images/EFwNspnXENR7DdkqtqWT3U/image-2.webp', alt: 'Golden mango frozen Dardoma on a wooden stick' },
  { id: 'karkade', name: 'Karkade Dardoma', emoji: '❤️', price: 10, note: 'Ruby-bright hibiscus', badge: 'THE RUBY ONE', image: '/manus-storage/async-images/EFwNspnXENR7DdkqtqWT3U/image-3.webp', alt: 'Ruby hibiscus karkade frozen Dardoma on a wooden stick' },
  { id: 'pepsi', name: 'Pepsi Dardoma', emoji: '🥤', price: 10, note: 'Cool cola with a fizz', badge: 'THE COOL ONE', image: '/manus-storage/async-images/EFwNspnXENR7DdkqtqWT3U/image-4.webp', alt: 'Cola-brown frozen Dardoma on a wooden stick' }
];
const DELIVERY_FEE = 20;
const CART_KEY = 'dardomamogs.cart.v1';
const API_URL = ''; // After deploying Code.gs, paste its /exec web-app URL here.
const ORDER_STATUSES = ['Order Received', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered'];
let cart = loadCart();
let toastTimer;
let activeTrackingScript = null;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const money = amount => `${new Intl.NumberFormat('en-EG', { maximumFractionDigits: 0 }).format(amount)} EGP`;
const productById = id => PRODUCTS.find(product => product.id === id);

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
    return Object.fromEntries(Object.entries(saved).filter(([id, quantity]) => productById(id) && Number.isInteger(quantity) && quantity > 0).map(([id, quantity]) => [id, Math.min(quantity, 99)]));
  } catch (_) {
    return {};
  }
}

function persistCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
  catch (_) { showToast('Your browser could not save this bag. Please keep this page open.'); }
  renderCart();
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function renderProducts() {
  $('#productGrid').innerHTML = PRODUCTS.map(product => `
    <article class="product-card" data-product="${product.id}">
      <div class="product-image-wrap">
        <img class="product-image" src="${product.image}" alt="${escapeHTML(product.alt)}" loading="lazy" width="600" height="750">
        <span class="product-badge">${escapeHTML(product.badge)}</span>
      </div>
      <div class="product-card-body">
        <div class="product-title-row"><h3>${escapeHTML(product.name)}</h3><span class="product-emoji" aria-hidden="true">${product.emoji}</span></div>
        <p class="product-description">${escapeHTML(product.note)}</p>
        <div class="product-buy-row">
          <span class="product-price">${money(product.price)} <span>/ each</span></span>
          <div class="product-actions">
            <div class="quantity-picker" aria-label="Choose ${escapeHTML(product.name)} quantity">
              <button type="button" data-product-decrement="${product.id}" aria-label="Choose one fewer ${escapeHTML(product.name)}">−</button>
              <span data-selected-quantity="${product.id}" aria-live="polite">1</span>
              <button type="button" data-product-increment="${product.id}" aria-label="Choose one more ${escapeHTML(product.name)}">+</button>
            </div>
            <button class="add-button" type="button" data-add-product="${product.id}" aria-label="Add ${escapeHTML(product.name)} to bag">+</button>
          </div>
        </div>
      </div>
    </article>`).join('');
}

function cartEntries() {
  return Object.entries(cart).map(([id, quantity]) => ({ product: productById(id), quantity })).filter(entry => entry.product && entry.quantity > 0);
}
function subtotal() { return cartEntries().reduce((sum, entry) => sum + entry.product.price * entry.quantity, 0); }
function itemCount() { return cartEntries().reduce((sum, entry) => sum + entry.quantity, 0); }

function renderCart() {
  const entries = cartEntries();
  const count = itemCount();
  $('#cartCount').textContent = count;
  $('#drawerCount').textContent = count;
  $('#clearCart').disabled = entries.length === 0;
  $('#cartItems').innerHTML = entries.length ? entries.map(({ product, quantity }) => `
    <div class="cart-line" data-cart-line="${product.id}">
      <img src="${product.image}" alt="" width="58" height="67">
      <div class="cart-line-copy"><strong>${escapeHTML(product.name)}</strong><small>${money(product.price)} each</small>
        <div class="cart-line-controls">
          <button type="button" data-cart-decrement="${product.id}" aria-label="Remove one ${escapeHTML(product.name)}">−</button>
          <span>${quantity}</span>
          <button type="button" data-cart-increment="${product.id}" aria-label="Add one ${escapeHTML(product.name)}">+</button>
        </div>
      </div>
      <div class="cart-line-side"><strong>${money(product.price * quantity)}</strong><button class="remove-line" type="button" data-remove-item="${product.id}">Remove</button></div>
    </div>`).join('') : '<div class="cart-empty"><b>✳</b>Your bag is taking a little sunny break.<br>Add a flavor to bring it back.</div>';
  const itemsSubtotal = subtotal();
  $('#cartSubtotal').textContent = money(itemsSubtotal);
  $('#cartDelivery').textContent = entries.length ? money(DELIVERY_FEE) : money(0);
  $('#cartTotal').textContent = money(itemsSubtotal + (entries.length ? DELIVERY_FEE : 0));
  refreshStoreHours();
}

function showToast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => node.classList.remove('is-visible'), 2600);
}

function getCairoMinutes() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const hour = Number(parts.find(part => part.type === 'hour').value);
  const minute = Number(parts.find(part => part.type === 'minute').value);
  return hour * 60 + minute;
}
function isStoreOpen() {
  const minute = getCairoMinutes();
  return minute >= 14 * 60 || minute < 2 * 60;
}
function refreshStoreHours() {
  const open = isStoreOpen();
  const status = $('#storeStatus');
  const detail = $('#storeStatusDetail');
  const light = $('#statusLight');
  light.classList.toggle('status-light-open', open);
  light.classList.toggle('status-light-closed', !open);
  status.textContent = open ? 'Open now · we’re taking orders' : 'Closed for a little rest';
  detail.textContent = open ? 'Here until 2:00 AM · Cairo time' : 'We open at 2:00 PM · Cairo time';
  $('#checkoutOpen').disabled = itemCount() === 0 || !open;
  $('#cartHoursNote').textContent = open ? 'Orders are open until 2:00 AM Cairo time.' : 'We’ll be back at 2:00 PM Cairo time. Your bag will be here.';
  if ($('#confirmOrder')) $('#confirmOrder').disabled = !open;
  if ($('#checkoutError') && !open && $('#checkoutDialog').open) $('#checkoutError').textContent = 'The shop is closed right now. Please send your order between 2:00 PM and 2:00 AM Cairo time.';
}

function openCart() {
  $('#cartDrawer').inert = false;
  $('#cartDrawer').classList.add('is-open');
  $('#cartDrawer').setAttribute('aria-hidden', 'false');
  $('#cartOpen').setAttribute('aria-expanded', 'true');
  $('#drawerBackdrop').hidden = false;
  $('#cartClose').focus();
}
function closeCart() {
  $('#cartDrawer').classList.remove('is-open');
  $('#cartDrawer').setAttribute('aria-hidden', 'true');
  $('#cartOpen').setAttribute('aria-expanded', 'false');
  $('#drawerBackdrop').hidden = true;
  window.setTimeout(() => { $('#cartDrawer').inert = true; }, 310);
  $('#cartOpen').focus();
}

function contactLooksValid(value) {
  const contact = value.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return true;
  const digits = contact.replace(/\D/g, '');
  return digits.length >= 7 && /^[+0-9\s().-]+$/.test(contact);
}
function setCheckoutError(message) {
  const node = $('#checkoutError');
  node.textContent = message;
  node.hidden = !message;
}
function readCheckout() {
  const form = $('#checkoutForm');
  if (!form.reportValidity()) return null;
  const name = $('#customerName').value.trim();
  const contact = $('#customerContact').value.trim();
  if (name.length < 2) { setCheckoutError('Please enter the name you’d like us to use.'); $('#customerName').focus(); return null; }
  if (!contactLooksValid(contact)) { setCheckoutError('Enter a valid phone number or email so the shop can reach you.'); $('#customerContact').focus(); return null; }
  const entries = cartEntries();
  if (!entries.length) { setCheckoutError('Your bag is empty. Pick a flavor first.'); return null; }
  const notes = $('#orderNotes').value.trim();
  const paymentMethod = $('input[name="paymentMethod"]:checked').value;
  return { name, contact, notes, paymentMethod, items: entries.map(({ product, quantity }) => ({ id: product.id, quantity })), subtotal: subtotal(), deliveryFee: DELIVERY_FEE, total: subtotal() + DELIVERY_FEE };
}
function showReview(order) {
  const lines = [
    `Name: ${order.name}`,
    `Contact: ${order.contact}`,
    '',
    ...cartEntries().map(({ product, quantity }) => `${quantity} × ${product.name}  —  ${money(product.price * quantity)}`),
    '',
    `Subtotal: ${money(order.subtotal)}`,
    `Delivery: ${money(order.deliveryFee)}`,
    `TOTAL: ${money(order.total)}`,
    `Payment: ${order.paymentMethod}`,
    ...(order.notes ? [`Note: ${order.notes}`] : [])
  ];
  $('#reviewLines').textContent = lines.join('\n');
  $('#checkoutFields').hidden = true;
  $('#reviewPanel').hidden = false;
  setCheckoutError('');
  $('#confirmOrder').focus();
}
function editCheckout() {
  $('#reviewPanel').hidden = true;
  $('#checkoutFields').hidden = false;
  $('#reviewOrder').focus();
}
function makeRequestId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') return `dm_${window.crypto.randomUUID()}`;
  return `dm_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
function allowedGoogleOrigin(origin) {
  try {
    const host = new URL(origin).hostname;
    return host === 'script.google.com' || host.endsWith('.script.google.com') || host.endsWith('.googleusercontent.com');
  } catch (_) { return false; }
}
function postOrder(payload) {
  return new Promise((resolve, reject) => {
    if (!API_URL || !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(API_URL)) {
      reject(new Error('The shop’s Google Apps Script URL is not connected yet. Follow SETUP.md, paste the /exec URL into script.js, and republish.'));
      return;
    }
    const requestId = makeRequestId();
    let finished = false;
    const finish = (error, result) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      const target = document.querySelector(`iframe[name="${frameName}"]`);
      const form = document.querySelector(`form[data-request="${requestId}"]`);
      if (target) target.remove();
      if (form) form.remove();
      error ? reject(error) : resolve(result);
    };
    const frameName = `dardomaOrder_${requestId.replace(/[^a-zA-Z0-9_]/g, '')}`;
    const onMessage = event => {
      if (!allowedGoogleOrigin(event.origin) || !event.data || event.data.type !== 'DARDOMA_ORDER_RESULT' || event.data.requestId !== requestId) return;
      if (!event.data.ok) finish(new Error(event.data.message || 'The shop could not receive that order. Please try again.'));
      else finish(null, event.data);
    };
    const timer = window.setTimeout(() => finish(new Error('The shop response took too long. Please check your connection and try again.')), 35000);
    window.addEventListener('message', onMessage);
    const iframe = document.createElement('iframe');
    iframe.name = frameName;
    iframe.title = 'Order submission response';
    iframe.hidden = true;
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = API_URL;
    form.target = frameName;
    form.hidden = true;
    form.dataset.request = requestId;
    const field = document.createElement('input');
    field.type = 'hidden';
    field.name = 'payload';
    field.value = JSON.stringify({ ...payload, requestId });
    form.appendChild(field);
    document.body.appendChild(form);
    form.submit();
  });
}

function submitCheckout() {
  if (!isStoreOpen()) { refreshStoreHours(); return; }
  if (!API_URL) { setCheckoutError('The shop’s Google Apps Script URL is not connected yet. See SETUP.md to connect Google Form and Sheets before taking live orders.'); return; }
  const order = readCheckout();
  if (!order) return;
  const button = $('#confirmOrder');
  button.disabled = true;
  button.textContent = 'Sending your order…';
  setCheckoutError('');
  postOrder(order).then(result => {
    cart = {};
    persistCart();
    $('#checkoutDialog').close();
    $('#confirmedOrderNumber').textContent = result.orderNumber;
    $('#confirmedTrackingCode').textContent = result.trackingCode;
    $('#confirmationTotal').textContent = `Your total: ${money(Number(result.total) || order.total)}`;
    $('#confirmationDialog').showModal();
    $('#trackingMessage').hidden = true;
    $('#trackOrder').value = result.orderNumber;
    $('#trackCode').value = result.trackingCode;
  }).catch(error => {
    setCheckoutError(error.message || 'We couldn’t send the order. Please try again.');
  }).finally(() => {
    button.disabled = !isStoreOpen();
    button.innerHTML = 'Confirm order <span aria-hidden="true">✓</span>';
  });
}

function showTrackingMessage(message, error = false) {
  const node = $('#trackingMessage');
  node.textContent = message;
  node.classList.toggle('error', error);
  node.hidden = false;
  $('#trackingResult').hidden = true;
}
function getTracking(orderNumber, trackingCode) {
  return new Promise((resolve, reject) => {
    if (!API_URL) { reject(new Error('Order tracking isn’t connected yet. The shop owner needs to deploy Code.gs and set its /exec URL in script.js.')); return; }
    if (activeTrackingScript) activeTrackingScript.remove();
    const callbackName = `dardomaTrack_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let done = false;
    const cleanup = () => {
      window.clearTimeout(timeout);
      delete window[callbackName];
      if (activeTrackingScript) { activeTrackingScript.remove(); activeTrackingScript = null; }
    };
    const timeout = window.setTimeout(() => {
      if (done) return;
      done = true; cleanup(); reject(new Error('Tracking took too long. Please check your connection and try again.'));
    }, 20000);
    window[callbackName] = data => {
      if (done) return;
      done = true; cleanup();
      data && data.ok ? resolve(data) : reject(new Error((data && data.message) || 'We couldn’t find that order. Check both details and try again.'));
    };
    activeTrackingScript = document.createElement('script');
    activeTrackingScript.src = `${API_URL}?action=track&orderNumber=${encodeURIComponent(orderNumber)}&trackingCode=${encodeURIComponent(trackingCode)}&callback=${encodeURIComponent(callbackName)}`;
    activeTrackingScript.onerror = () => { if (!done) { done = true; cleanup(); reject(new Error('Tracking service unavailable. Please try again in a moment.')); } };
    document.head.appendChild(activeTrackingScript);
  });
}
function renderTracking(data) {
  $('#trackingMessage').hidden = true;
  $('#trackedOrderNumber').textContent = data.orderNumber;
  $('#trackedStatus').textContent = data.status;
  const currentIndex = ORDER_STATUSES.indexOf(data.status);
  $('#statusSteps').innerHTML = ORDER_STATUSES.map((status, index) => `<li class="${index < currentIndex ? 'is-done' : ''} ${index === currentIndex ? 'is-current' : ''}" ${index === currentIndex ? 'aria-current="step"' : ''}>${escapeHTML(status)}</li>`).join('');
  const meta = [];
  if (data.createdAt) meta.push(`Placed ${new Date(data.createdAt).toLocaleString('en-EG', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short' })} Cairo time`);
  if (Number.isFinite(Number(data.total))) meta.push(`Total ${money(Number(data.total))}`);
  $('#trackedMeta').textContent = meta.join(' · ');
  const hasMap = data.status === 'Out for Delivery' && Number.isFinite(Number(data.latitude)) && Number.isFinite(Number(data.longitude)) && Math.abs(Number(data.latitude)) <= 90 && Math.abs(Number(data.longitude)) <= 180;
  const map = $('#deliveryMap');
  map.hidden = !hasMap;
  if (hasMap) $('#mapFrame').src = `https://www.google.com/maps?q=${encodeURIComponent(`${Number(data.latitude)},${Number(data.longitude)}`)}&z=15&output=embed`;
  else $('#mapFrame').removeAttribute('src');
  $('#trackingResult').hidden = false;
}

$('#productGrid').addEventListener('click', event => {
  const increment = event.target.closest('[data-product-increment]');
  const decrement = event.target.closest('[data-product-decrement]');
  const add = event.target.closest('[data-add-product]');
  if (increment || decrement) {
    const control = increment || decrement;
    const id = control.dataset.productIncrement || control.dataset.productDecrement;
    const selected = $(`[data-selected-quantity="${id}"]`);
    selected.textContent = Math.min(20, Math.max(1, Number(selected.textContent) + (increment ? 1 : -1)));
  }
  if (add) {
    const id = add.dataset.addProduct;
    const selected = $(`[data-selected-quantity="${id}"]`);
    cart[id] = Math.min(99, (cart[id] || 0) + Number(selected.textContent));
    selected.textContent = '1';
    persistCart();
    add.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }], { duration: 230, easing: 'ease-out' });
    showToast(`${productById(id).name} added to your little bag`);
  }
});
$('#cartItems').addEventListener('click', event => {
  const inc = event.target.closest('[data-cart-increment]');
  const dec = event.target.closest('[data-cart-decrement]');
  const remove = event.target.closest('[data-remove-item]');
  if (inc) cart[inc.dataset.cartIncrement] = Math.min(99, (cart[inc.dataset.cartIncrement] || 0) + 1);
  if (dec) {
    const id = dec.dataset.cartDecrement;
    cart[id] = (cart[id] || 0) - 1;
    if (cart[id] <= 0) delete cart[id];
  }
  if (remove) delete cart[remove.dataset.removeItem];
  if (inc || dec || remove) persistCart();
});
$('#cartOpen').addEventListener('click', openCart);
$('#cartClose').addEventListener('click', closeCart);
$('#drawerBackdrop').addEventListener('click', closeCart);
$('#clearCart').addEventListener('click', () => {
  if (!itemCount()) return;
  if (window.confirm('Clear every flavor from your bag?')) { cart = {}; persistCart(); showToast('Your bag is all clear.'); }
});
$('#checkoutOpen').addEventListener('click', () => {
  if (!itemCount()) return;
  if (!isStoreOpen()) { refreshStoreHours(); return; }
  closeCart();
  $('#reviewPanel').hidden = true;
  $('#checkoutFields').hidden = false;
  setCheckoutError('');
  $('#checkoutForm').reset();
  $('#checkoutDialog').showModal();
  $('#customerName').focus();
});
$('#checkoutClose').addEventListener('click', () => $('#checkoutDialog').close());
$('#reviewOrder').addEventListener('click', () => {
  setCheckoutError('');
  const order = readCheckout();
  if (order) showReview(order);
});
$('#editOrder').addEventListener('click', editCheckout);
$('#confirmOrder').addEventListener('click', submitCheckout);
$('#checkoutDialog').addEventListener('close', () => setCheckoutError(''));
$('#confirmationClose').addEventListener('click', () => $('#confirmationDialog').close());
$('#followOrder').addEventListener('click', () => {
  $('#confirmationDialog').close();
  document.querySelector('#track').scrollIntoView({ behavior: 'smooth' });
  window.setTimeout(() => $('#trackCode').focus({ preventScroll: true }), 400);
});
$('#trackingForm').addEventListener('submit', event => {
  event.preventDefault();
  const orderNumber = $('#trackOrder').value.trim().toUpperCase();
  const trackingCode = $('#trackCode').value.trim();
  if (orderNumber.length < 8 || trackingCode.length < 8) { showTrackingMessage('Enter the order number and the full private tracking code from your confirmation.', true); return; }
  $('#trackingMessage').hidden = true;
  $('#trackingResult').hidden = true;
  getTracking(orderNumber, trackingCode).then(renderTracking).catch(error => showTrackingMessage(error.message, true));
});
document.addEventListener('keydown', event => { if (event.key === 'Escape' && $('#cartDrawer').classList.contains('is-open')) closeCart(); });
renderProducts();
renderCart();
window.setInterval(refreshStoreHours, 60 * 1000);
