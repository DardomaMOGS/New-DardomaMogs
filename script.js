"use strict";

/* =========================================================
   DARDOMAMOGS — COMPLETE SCRIPT.JS
   Matches the current DardomaMOGS HTML IDs.
   ========================================================= */

const CONFIG = {
  storeName: "DardomaMOGS",
  openingHour: 14,
  closingHour: 2,
  deliveryFee: 20,

  cartStorageKey: "dardoma_mogs_cart",
  ordersStorageKey: "dardoma_mogs_orders",
  lastOrderKey: "dardoma_mogs_last_order",

  googleFormAction:
    "https://docs.google.com/forms/d/e/1FAIpQLSfcFu09aQGcBszMQvutwk_huj8BK4CqtSwdU8HerbVei-lftw/formResponse",

  trackingApi:
    "https://script.google.com/macros/s/AKfycby9GyMIelR3lAnmaAaJlPBWMKw8v_SdIDuc6ZT_useCESQCM-TyPvXVYPG-JTOkB5WAVg/exec",

  googleFormEntries: {
    name: "entry.1661561910",
    contact: "entry.544821231",
    order: "entry.1211593112",
    notes: "entry.212349483",
    payment: "entry.412155072"
  }
};


/* =========================================================
   PRODUCTS
   ========================================================= */

const PRODUCTS = {

  mango: {
    id: "mango",
    name: "Mango Dardoma",
    emoji: "🥭",
    price: 10,
    description: "Sweet mango flavor."
  },

  karkade: {
    id: "karkade",
    name: "Karkade Dardoma",
    emoji: "❤️",
    price: 10,
    description: "Refreshing karkade flavor."
  },

  pepsi: {
    id: "pepsi",
    name: "Pepsi Dardoma",
    emoji: "🥤",
    price: 10,
    description: "Cool Pepsi flavor."
  }

};


/* =========================================================
   STATE
   ========================================================= */

let cart = loadCart();
let currentOrder = null;
let submitting = false;


/* =========================================================
   HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}


function money(value) {
  return `${Number(value || 0).toFixed(2)} EGP`;
}


function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


function showToast(message) {

  let toast = $("toast");

  if (!toast) {

    toast = document.createElement("div");

    toast.id = "toast";

    toast.style.cssText =
      "position:fixed;" +
      "left:50%;" +
      "bottom:25px;" +
      "transform:translateX(-50%);" +
      "z-index:99999;" +
      "padding:13px 20px;" +
      "border-radius:14px;" +
      "background:#172018;" +
      "color:#fff;" +
      "font-weight:800;" +
      "box-shadow:0 12px 35px rgba(0,0,0,.25);" +
      "max-width:90%;" +
      "text-align:center;";

    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.hidden = false;

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.hidden = true;
  }, 3000);
}


/* =========================================================
   STORE HOURS
   ========================================================= */

function isStoreOpen() {

  const hour =
    new Date().getHours();

  return (
    hour >= CONFIG.openingHour ||
    hour < CONFIG.closingHour
  );
}


function updateStoreStatus() {

  const open =
    isStoreOpen();

  document
    .querySelectorAll(
      "#storeStatus, #heroStatus, .store-status"
    )
    .forEach(element => {

      element.classList.toggle(
        "closed",
        !open
      );

      element.textContent =
        open
          ? "🟢 We're Open"
          : "🔴 We're Closed";
    });


  const notice =
    $("closedNotice");

  if (notice) {
    notice.hidden = open;
  }
}


/* =========================================================
   CART STORAGE
   ========================================================= */

function loadCart() {

  try {

    const saved =
      localStorage.getItem(
        CONFIG.cartStorageKey
      );

    const parsed =
      saved
        ? JSON.parse(saved)
        : {};

    return (
      parsed &&
      typeof parsed === "object"
    )
      ? parsed
      : {};

  } catch (_) {

    return {};
  }
}


function saveCart() {

  try {

    localStorage.setItem(
      CONFIG.cartStorageKey,
      JSON.stringify(cart)
    );

  } catch (error) {

    console.warn(
      "Cart save failed:",
      error
    );
  }
}


/* =========================================================
   CART CALCULATIONS
   ========================================================= */

function getCartItems() {

  return Object.values(cart)

    .filter(item =>
      item &&
      PRODUCTS[item.id] &&
      Number(item.quantity) > 0
    )

    .map(item => ({

      id:
        item.id,

      quantity:
        Number(item.quantity),

      product:
        PRODUCTS[item.id]

    }));
}


function getCartCount() {

  return getCartItems().reduce(
    (sum, item) =>
      sum + item.quantity,
    0
  );
}


function getSubtotal() {

  return getCartItems().reduce(
    (sum, item) =>
      sum +
      item.product.price *
      item.quantity,
    0
  );
}


function getDeliveryFee() {

  return getCartItems().length
    ? CONFIG.deliveryFee
    : 0;
}


function getTotal() {

  return (
    getSubtotal() +
    getDeliveryFee()
  );
}


/* =========================================================
   PRODUCTS
   ========================================================= */

function renderProducts() {

  const grid =
    $("productGrid");

  if (!grid) {
    return;
  }


  grid.innerHTML =
    Object.values(PRODUCTS)

      .map(product => `

        <article class="product-card">

          <div class="product-image">
            ${product.emoji}
          </div>

          <div>

            <h3>
              ${escapeHTML(
                product.name
              )}
            </h3>

            <p>
              ${escapeHTML(
                product.description
              )}
            </p>

          </div>

          <div class="price-row">

            <span class="price">
              ${money(product.price)}
            </span>

            <button
              type="button"
              class="btn primary"
              onclick="addToCart('${product.id}')"
            >
              Add to Cart
            </button>

          </div>

        </article>

      `)

      .join("");
}


/* =========================================================
   CART COUNT
   ========================================================= */

function updateCartCount() {

  const count =
    getCartCount();


  document
    .querySelectorAll(
      "#floatingCartCount, #cartCount, .cart-count, .nav-cart-count"
    )

    .forEach(element => {

      element.textContent =
        count;

      if (
        element.classList.contains(
          "cart-count"
        ) ||
        element.classList.contains(
          "nav-cart-count"
        )
      ) {

        element.hidden =
          count === 0;
      }

    });
}


/* =========================================================
   ADD TO CART
   ========================================================= */

function addToCart(
  productId,
  quantity = 1
) {

  const product =
    PRODUCTS[productId];

  if (!product) {
    return;
  }


  if (!isStoreOpen()) {

    showToast(
      "🔴 We're closed right now. We're open from 2:00 PM to 2:00 AM."
    );

    return;
  }


  quantity =
    Math.max(
      1,
      parseInt(quantity, 10) || 1
    );


  if (!cart[productId]) {

    cart[productId] = {
      id:
        productId,

      quantity:
        0
    };
  }


  cart[productId].quantity +=
    quantity;


  saveCart();

  renderCart();

  updateCartCount();


  /*
   * IMPORTANT:
   * Use the selected product's emoji.
   *
   * Mango  → 🥭
   * Karkade → ❤️
   * Pepsi → 🥤
   */

  showToast(
    `${product.name} added to cart! ${product.emoji}`
  );
}


/* =========================================================
   CHANGE QUANTITY
   ========================================================= */

function changeQuantity(
  productId,
  amount
) {

  if (!cart[productId]) {
    return;
  }


  cart[productId].quantity =
    Number(
      cart[productId].quantity
    ) +
    Number(amount);


  if (
    cart[productId].quantity <= 0
  ) {

    delete cart[productId];
  }


  saveCart();

  renderCart();

  updateCartCount();
}


/* =========================================================
   REMOVE FROM CART
   ========================================================= */

function removeFromCart(
  productId
) {

  if (!cart[productId]) {
    return;
  }


  const product =
    PRODUCTS[productId];


  delete cart[productId];


  saveCart();

  renderCart();

  updateCartCount();


  if (product) {

    showToast(
      `${product.name} removed.`
    );
  }
}


/* =========================================================
   CLEAR CART
   ========================================================= */

function clearCart() {

  cart = {};

  saveCart();

  renderCart();

  updateCartCount();

  showToast(
    "Cart cleared."
  );
}


/* =========================================================
   RENDER CART
   ========================================================= */

function renderCart() {

  const container =
    $("cartItems");

  if (!container) {
    return;
  }


  const items =
    getCartItems();


  if (!items.length) {

    container.innerHTML = `

      <div class="empty-cart">

        <div class="empty-icon">
          🛒
        </div>

        <h3>
          Your cart is empty
        </h3>

        <p>
          Add some delicious
          Dardoma to get started!
        </p>

        <a
          class="btn primary"
          href="#products"
        >
          Browse Products
        </a>

      </div>

    `;

  } else {

    container.innerHTML =

      items

        .map(item => {

          const product =
            item.product;

          const itemTotal =
            product.price *
            item.quantity;


          return `

            <div class="cart-row">

              <div class="cart-thumb">
                ${product.emoji}
              </div>

              <div class="cart-info">

                <h4>
                  ${escapeHTML(
                    product.name
                  )}
                </h4>

                <p>
                  ${money(
                    product.price
                  )} each
                </p>

                <div class="qty">

                  <button
                    type="button"
                    onclick="changeQuantity('${product.id}', -1)"
                  >
                    −
                  </button>

                  <strong>
                    ${item.quantity}
                  </strong>

                  <button
                    type="button"
                    onclick="changeQuantity('${product.id}', 1)"
                  >
                    +
                  </button>

                </div>

                <button
                  type="button"
                  class="remove"
                  onclick="removeFromCart('${product.id}')"
                >
                  Remove
                </button>

              </div>

              <div>

                <strong>
                  ${money(itemTotal)}
                </strong>

              </div>

            </div>

          `;

        })

        .join("");
  }


  renderSummary();
}


/* =========================================================
   SUMMARY
   ========================================================= */

function renderSummary() {

  /*
   * Current HTML IDs:
   * summarySubtotal
   * summaryDelivery
   * summaryTotal
   */

  const subtotal =
    $("summarySubtotal") ||
    $("subtotal");


  const delivery =
    $("summaryDelivery") ||
    $("deliveryFee");


  const total =
    $("summaryTotal") ||
    $("cartTotal");


  if (subtotal) {

    subtotal.textContent =
      money(getSubtotal());
  }


  if (delivery) {

    delivery.textContent =
      money(getDeliveryFee());
  }


  if (total) {

    total.textContent =
      money(getTotal());
  }


  /*
   * Current HTML uses #goCheckout.
   */

  const checkoutButton =
    $("goCheckout") ||
    $("checkoutButton");


  if (checkoutButton) {

    checkoutButton.disabled =
      getCartItems().length === 0;
  }
}


/* =========================================================
   CONTINUE TO CHECKOUT
   ========================================================= */

function prepareCheckout() {

  if (!isStoreOpen()) {

    showToast(
      "🔴 The store is closed right now."
    );

    return;
  }


  if (!getCartItems().length) {

    showToast(
      "Your cart is empty."
    );

    return;
  }


  renderCheckoutPreview();


  const checkout =
    $("checkout");


  if (checkout) {

    checkout.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } else {

    window.location.hash =
      "checkout";
  }
}


/* =========================================================
   CONTINUE TO CHECKOUT BUTTON
   ========================================================= */

function setupCheckoutButton() {

  /*
   * The actual HTML button is:
   *
   * id="goCheckout"
   *
   * The old JavaScript was looking for:
   *
   * id="checkoutButton"
   *
   * That was why nothing happened.
   */

  const button =
    $("goCheckout") ||
    $("checkoutButton");


  if (!button) {

    console.warn(
      "Continue to Checkout button not found."
    );

    return;
  }


  button.addEventListener(
    "click",
    event => {

      event.preventDefault();

      event.stopPropagation();

      prepareCheckout();

    }
  );
}


/* =========================================================
   CLEAR CART BUTTON
   ========================================================= */

function setupClearCartButton() {

  const button =
    $("clearCart") ||
    $("clearCartButton");


  if (!button) {
    return;
  }


  button.addEventListener(
    "click",
    event => {

      event.preventDefault();

      clearCart();

    }
  );
}


/* =========================================================
   CHECKOUT PREVIEW
   ========================================================= */

function renderCheckoutPreview() {

  const preview =
    $("checkoutPreview");


  if (!preview) {
    return;
  }


  const items =
    getCartItems();


  if (!items.length) {

    preview.textContent =
      "Your cart is empty.";

    return;
  }


  const lines =
    items.map(item =>

      `${item.quantity} × ${item.product.name} — ${money(
        item.product.price *
        item.quantity
      )}`

    );


  lines.push("");

  lines.push(
    `Subtotal: ${money(
      getSubtotal()
    )}`
  );

  lines.push(
    `Delivery: ${money(
      getDeliveryFee()
    )}`
  );

  lines.push(
    `Total: ${money(
      getTotal()
    )}`
  );


  preview.textContent =
    lines.join("\n");
}


/* =========================================================
   CHECKOUT FORM
   ========================================================= */

function setupCheckoutForm() {

  const form =
    $("checkoutForm");


  if (!form) {
    return;
  }


  form.addEventListener(
    "submit",
    event => {

      event.preventDefault();

      event.stopPropagation();

      reviewOrder();

    }
  );


  [
    "customerName",
    "customerContact",
    "paymentMethod",
    "customerNotes"
  ]

    .forEach(id => {

      const input =
        $(id);

      if (!input) {
        return;
      }


      input.addEventListener(
        "input",
        renderCheckoutPreview
      );


      input.addEventListener(
        "change",
        renderCheckoutPreview
      );

    });
}


/* =========================================================
   CREATE ORDER
   ========================================================= */

function createOrder() {

  const items =
    getCartItems();


  return {

    orderNumber:
      generateOrderNumber(),

    trackingToken:
      generateTrackingToken(),

    name:
      $("customerName")
        ?.value
        .trim() || "",

    contact:
      $("customerContact")
        ?.value
        .trim() || "",

    payment:
      $("paymentMethod")
        ?.value || "",

    notes:
      $("customerNotes")
        ?.value
        .trim() || "",

    items:
      items.map(item => ({

        id:
          item.product.id,

        name:
          item.product.name,

        quantity:
          item.quantity,

        price:
          item.product.price

      })),

    subtotal:
      getSubtotal(),

    deliveryFee:
      getDeliveryFee(),

    total:
      getTotal(),

    status:
      "Order Received",

    createdAt:
      new Date().toISOString()
  };
}


/* =========================================================
   ORDER NUMBER
   ========================================================= */

function generateOrderNumber() {

  let number;


  do {

    number =
      `DM-${Math.floor(
        1000 +
        Math.random() *
        9000
      )}`;

  }

  while (
    orderExists(number)
  );


  return number;
}


function orderExists(
  orderNumber
) {

  try {

    const orders =
      JSON.parse(
        localStorage.getItem(
          CONFIG.ordersStorageKey
        ) || "[]"
      );


    return (
      Array.isArray(orders) &&
      orders.some(
        order =>
          order?.orderNumber ===
          orderNumber
      )
    );

  } catch (_) {

    return false;
  }
}


/* =========================================================
   TRACKING CODE
   ========================================================= */

function generateTrackingToken() {

  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


  let code = "";


  for (
    let i = 0;
    i < 10;
    i++
  ) {

    code +=
      chars[
        Math.floor(
          Math.random() *
          chars.length
        )
      ];
  }


  return code;
}


/* =========================================================
   SAVE ORDER LOCALLY
   ========================================================= */

function saveOrderLocally(
  order
) {

  try {

    const orders =
      JSON.parse(
        localStorage.getItem(
          CONFIG.ordersStorageKey
        ) || "[]"
      );


    const safeOrders =
      Array.isArray(orders)
        ? orders
        : [];


    safeOrders.push(order);


    localStorage.setItem(
      CONFIG.ordersStorageKey,
      JSON.stringify(
        safeOrders
      )
    );


    localStorage.setItem(
      CONFIG.lastOrderKey,
      JSON.stringify(order)
    );


  } catch (error) {

    console.warn(
      "Could not save order locally:",
      error
    );
  }
}


/* =========================================================
   GOOGLE FORM ORDER
   ========================================================= */

function formatGoogleFormOrder(
  order
) {

  const items =
    order.items

      .map(item =>
        `${item.quantity} × ${item.name} — ${money(
          item.price *
          item.quantity
        )}`
      )

      .join("\n");


  return [

    `Order Number: ${order.orderNumber}`,

    `Tracking Code: ${order.trackingToken}`,

    "",

    items,

    "",

    `Subtotal: ${money(
      order.subtotal
    )}`,

    `Delivery: ${money(
      order.deliveryFee
    )}`,

    `Total: ${money(
      order.total
    )}`

  ].join("\n");
}


/* =========================================================
   SUBMIT GOOGLE FORM
   ========================================================= */

function submitGoogleForm(
  order
) {

  /*
   * Current HTML uses:
   *
   * googleOrderForm
   *
   * and:
   *
   * googleFormTarget
   */

  const form =
    $("googleOrderForm");


  if (!form) {

    console.error(
      "googleOrderForm was not found."
    );

    showToast(
      "The order form is missing."
    );

    return false;
  }


  const entries =
    CONFIG.googleFormEntries;


  const orderText =
    formatGoogleFormOrder(
      order
    );


  const notesText = [

    `Order Number: ${order.orderNumber}`,

    `Tracking Code: ${order.trackingToken}`,

    order.notes

  ]

    .filter(Boolean)

    .join("\n");


  const fields = {

    gName: [
      entries.name,
      order.name
    ],

    gContact: [
      entries.contact,
      order.contact
    ],

    gOrder: [
      entries.order,
      orderText
    ],

    gNotes: [
      entries.notes,
      notesText
    ],

    gPayment: [
      entries.payment,
      order.payment
    ]

  };


  Object.entries(
    fields
  ).forEach(
    ([id, [name, value]]) => {

      let input =
        $(id) ||
        form.querySelector(
          `[name="${name}"]`
        );


      if (!input) {

        input =
          document.createElement(
            "input"
          );

        input.type =
          "hidden";

        form.appendChild(
          input
        );
      }


      input.id =
        id;

      input.name =
        name;

      input.value =
        value ?? "";

    }
  );


  form.action =
    CONFIG.googleFormAction;

  form.method =
    "POST";

  form.target =
    "googleFormTarget";


  try {

    HTMLFormElement
      .prototype
      .submit
      .call(form);

    return true;

  } catch (error) {

    console.error(
      "Google Form submission failed:",
      error
    );

    return false;
  }
}


/* =========================================================
   REVIEW ORDER
   ========================================================= */

function reviewOrder() {

  const form =
    $("checkoutForm");


  if (!form) {
    return false;
  }


  if (!isStoreOpen()) {

    showToast(
      "🔴 The store is closed right now."
    );

    return false;
  }


  if (!getCartItems().length) {

    showToast(
      "Your cart is empty."
    );

    return false;
  }


  if (!form.checkValidity()) {

    form.reportValidity();

    return false;
  }


  /*
   * Current HTML uses:
   *
   * reviewPanel
   * reviewContent
   */

  const reviewPanel =
    $("reviewPanel");


  const reviewContent =
    $("reviewContent");


  if (
    !reviewPanel ||
    !reviewContent
  ) {

    console.error(
      "Review panel elements not found."
    );

    return false;
  }


  const items =
    getCartItems();


  const name =
    $("customerName")
      ?.value
      .trim() || "";


  const contact =
    $("customerContact")
      ?.value
      .trim() || "";


  const payment =
    $("paymentMethod")
      ?.value || "";


  const notes =
    $("customerNotes")
      ?.value
      .trim() || "";


  reviewContent.innerHTML = `

    <strong>
      Customer:
    </strong>

    ${escapeHTML(name)}

    <br>

    <strong>
      Contact:
    </strong>

    ${escapeHTML(contact)}

    <br>

    <strong>
      Payment:
    </strong>

    ${escapeHTML(payment)}

    <br>

    ${
      notes
        ? `
          <strong>
            Notes:
          </strong>

          ${escapeHTML(notes)}

          <br>
        `
        : ""
    }

    <br>

    ${
      items

        .map(item =>

          `${item.quantity} × ${escapeHTML(
            item.product.name
          )} — ${money(
            item.product.price *
            item.quantity
          )}`

        )

        .join("<br>")
    }

    <br><br>

    <strong>
      Subtotal:
    </strong>

    ${money(getSubtotal())}

    <br>

    <strong>
      Delivery:
    </strong>

    ${money(getDeliveryFee())}

    <br>

    <strong>
      Total:
    </strong>

    ${money(getTotal())}

  `;


  form.classList.add(
    "hidden"
  );


  reviewPanel.classList.remove(
    "hidden"
  );


  reviewPanel.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });


  return true;
}


/* =========================================================
   CANCEL REVIEW
   ========================================================= */

function cancelReview() {

  const form =
    $("checkoutForm");


  const reviewPanel =
    $("reviewPanel");


  if (form) {

    form.classList.remove(
      "hidden"
    );
  }


  if (reviewPanel) {

    reviewPanel.classList.add(
      "hidden"
    );
  }
}


/* =========================================================
   CONFIRM ORDER
   ========================================================= */

function confirmOrder() {

  if (submitting) {
    return;
  }


  if (!getCartItems().length) {

    showToast(
      "Your cart is empty."
    );

    return;
  }


  submitting = true;


  /*
   * Current HTML:
   *
   * confirmOrder
   */

  const button =
    $("confirmOrder");


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Sending Order...";
  }


  try {

    const order =
      createOrder();


    currentOrder =
      order;


    const sent =
      submitGoogleForm(
        order
      );


    if (!sent) {

      throw new Error(
        "Google Form submission failed."
      );
    }


    saveOrderLocally(
      order
    );


    cart = {};

    saveCart();

    renderCart();

    updateCartCount();


    const reviewPanel =
      $("reviewPanel");


    const successPanel =
      $("successPanel");


    const successText =
      $("successText");


    if (reviewPanel) {

      reviewPanel.classList.add(
        "hidden"
      );
    }


    if (successText) {

      successText.innerHTML = `

        Order

        <strong>
          ${escapeHTML(
            order.orderNumber
          )}
        </strong>

        was placed successfully.

        <br><br>

        Your tracking code is

        <strong>
          ${escapeHTML(
            order.trackingToken
          )}
        </strong>.

      `;
    }


    if (successPanel) {

      successPanel.classList.remove(
        "hidden"
      );


      successPanel.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }


    const form =
      $("checkoutForm");


    if (form) {

      form.reset();
    }


    showToast(
      "🎉 Order placed successfully!"
    );


  } catch (error) {

    console.error(
      "Order confirmation error:",
      error
    );


    showToast(
      "Something went wrong. Please try again."
    );


  } finally {

    submitting = false;


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Confirm & Send Order";
    }
  }
}


/* =========================================================
   REVIEW BUTTONS
   ========================================================= */

function setupReviewButtons() {

  const edit =
    $("editOrder");


  const confirm =
    $("confirmOrder");


  if (edit) {

    edit.addEventListener(
      "click",
      event => {

        event.preventDefault();

        cancelReview();

      }
    );
  }


  if (confirm) {

    confirm.addEventListener(
      "click",
      event => {

        event.preventDefault();

        confirmOrder();

      }
    );
  }
}


/* =========================================================
   TRACKING
   ========================================================= */

async function trackOrder(
  event
) {

  if (event) {

    event.preventDefault();
  }


  /*
   * Current HTML:
   *
   * trackingOrder
   * trackingToken
   */

  const orderInput =
    $("trackingOrder");


  const tokenInput =
    $("trackingToken");


  const result =
    $("trackingResult");


  const orderNumber =
    orderInput
      ?.value
      .trim()
      .toUpperCase() || "";


  const trackingCode =
    tokenInput
      ?.value
      .trim()
      .toUpperCase() || "";


  if (
    !orderNumber ||
    !trackingCode
  ) {

    showToast(
      "Enter both your Order Number and Tracking Code."
    );

    return;
  }


  if (result) {

    result.classList.remove(
      "hidden"
    );


    result.innerHTML =
      "<p>🔎 Looking up your order...</p>";
  }


  try {

    const params =
      new URLSearchParams({

        orderNumber,

        trackingCode,

        _:
          String(Date.now())

      });


    const response =
      await fetch(

        `${CONFIG.trackingApi}?${params.toString()}`,

        {
          method:
            "GET",

          cache:
            "no-store",

          redirect:
            "follow"
        }

      );


    const text =
      await response.text();


    if (!response.ok) {

      throw new Error(
        `Tracking server returned ${response.status}.`
      );
    }


    let data;


    try {

      data =
        JSON.parse(text);

    } catch (_) {

      throw new Error(
        "The tracking server did not return valid JSON."
      );
    }


    renderTrackingResult(
      data
    );


  } catch (error) {

    console.error(
      "Tracking error:",
      error
    );


    if (result) {

      result.classList.remove(
        "hidden"
      );


      result.innerHTML = `

        <div class="status-card">

          <h3>
            ⚠️ Tracking System Error
          </h3>

          <p>
            ${escapeHTML(
              error.message ||
              "Could not connect to the tracking system."
            )}
          </p>

        </div>

      `;
    }
  }
}


/* =========================================================
   TRACKING RESULT
   ========================================================= */

function renderTrackingResult(
  data
) {

  const result =
    $("trackingResult");


  if (!result) {
    return;
  }


  const order =
    data?.order ||
    (
      data?.found === true
        ? data
        : null
    );


  if (
    data?.success !== true ||
    !order
  ) {

    result.classList.remove(
      "hidden"
    );


    result.innerHTML = `

      <div class="status-card">

        <h3>
          ❌ Order Not Found
        </h3>

        <p>
          ${escapeHTML(
            data?.error ||
            "We couldn't find that order."
          )}
        </p>

        <p>
          Check your Order Number
          and Tracking Code.
        </p>

      </div>

    `;

    return;
  }


  const status =
    order.status ||
    "Order Received";


  const orderNumber =
    order.orderNumber ||
    "";


  const trackingCode =
    order.trackingCode ||
    "";


  const updated =
    order.lastUpdated ||
    "";


  const lat =
    order.latitude;


  const lon =
    order.longitude;


  let html = `

    <div class="status-card">

      <h3>
        ${escapeHTML(status)}
      </h3>

      <p>

        <strong>
          Order:
        </strong>

        ${escapeHTML(
          orderNumber
        )}

      </p>

      <p>

        <strong>
          Tracking Code:
        </strong>

        ${escapeHTML(
          trackingCode
        )}

      </p>

      ${
        updated

          ? `

            <p>

              <strong>
                Last Updated:
              </strong>

              ${escapeHTML(
                updated
              )}

            </p>

          `

          : ""
      }


      <div class="timeline">

        ${renderTimeline(status)}

      </div>

    </div>

  `;


  if (
    status
      .toLowerCase() ===
    "out for delivery"
  ) {

    const hasLocation =
      Number.isFinite(
        Number(lat)
      ) &&
      Number.isFinite(
        Number(lon)
      );


    html += `

      <div
        class="status-card"
        style="margin-top:18px;"
      >

        <h3>
          🚚 Out for Delivery
        </h3>

        <p>
          Your Dardoma is on the way!
        </p>

        ${
          hasLocation

            ? `

              <a
                class="btn primary"
                target="_blank"
                rel="noopener"
                href="https://www.openstreetmap.org/?mlat=${encodeURIComponent(
                  lat
                )}&mlon=${encodeURIComponent(
                  lon
                )}#map=17/${encodeURIComponent(
                  lat
                )}/${encodeURIComponent(
                  lon
                )}"
              >
                Open Delivery Map
              </a>

            `

            : `

              <p>
                📍 Delivery location
                hasn't been added yet.
              </p>

            `
        }

      </div>

    `;
  }


  result.classList.remove(
    "hidden"
  );


  result.innerHTML =
    html;
}


/* =========================================================
   TRACKING TIMELINE
   ========================================================= */

function renderTimeline(
  currentStatus
) {

  const statuses = [

    "Order Received",

    "Preparing",

    "Ready",

    "Out for Delivery",

    "Delivered"

  ];


  const currentIndex =
    statuses.indexOf(
      currentStatus
    );


  return statuses

    .map(
      (status, index) => `

        <div
          style="${
            status === currentStatus
              ? "font-weight:900;"
              : ""
          }"
        >

          ${
            currentIndex >= index
              ? "✓"
              : "○"
          }

          ${escapeHTML(status)}

        </div>

      `
    )

    .join("");
}


/* =========================================================
   TRACKING BUTTON
   ========================================================= */

function setupTracking() {

  const button =
    $("trackButton");


  if (button) {

    button.addEventListener(
      "click",
      trackOrder
    );
  }
}


/* =========================================================
   MOBILE MENU
   ========================================================= */

function setupMobileMenu() {

  const button =
    $("menuButton");


  const menu =
    $("mobileMenu");


  if (
    !button ||
    !menu
  ) {

    return;
  }


  button.addEventListener(
    "click",
    () => {

      menu.classList.toggle(
        "open"
      );

    }
  );


  menu
    .querySelectorAll("a")
    .forEach(link => {

      link.addEventListener(
        "click",
        () => {

          menu.classList.remove(
            "open"
          );

        }
      );

    });
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {

  document
    .querySelectorAll(
      'a[href^="#"]'
    )
    .forEach(link => {

      link.addEventListener(
        "click",
        event => {

          const id =
            link.getAttribute(
              "href"
            );


          if (
            !id ||
            id === "#"
          ) {

            return;
          }


          const target =
            document.querySelector(
              id
            );


          if (!target) {
            return;
          }


          event.preventDefault();


          target.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

        }
      );

    });
}


/* =========================================================
   PRODUCT URL
   ========================================================= */

function handleProductParameter() {

  const id =
    new URLSearchParams(
      window.location.search
    ).get(
      "product"
    );


  if (
    !id ||
    !PRODUCTS[id]
  ) {

    return;
  }


  setTimeout(
    () => {

      addToCart(id);


      const cartSection =
        $("cart");


      if (cartSection) {

        cartSection.scrollIntoView({
          behavior: "smooth"
        });
      }

    },
    500
  );
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

function init() {

  renderProducts();

  renderCart();

  updateCartCount();

  updateStoreStatus();

  renderCheckoutPreview();

  setupCheckoutButton();

  setupClearCartButton();

  setupCheckoutForm();

  setupReviewButtons();

  setupTracking();

  setupMobileMenu();

  setupNavigation();

  handleProductParameter();


  setInterval(
    updateStoreStatus,
    30000
  );


  console.log(
    "🥭 DardomaMOGS loaded successfully."
  );
}


/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.addToCart =
  addToCart;

window.changeQuantity =
  changeQuantity;

window.removeFromCart =
  removeFromCart;

window.clearCart =
  clearCart;

window.prepareCheckout =
  prepareCheckout;

window.reviewOrder =
  reviewOrder;

window.cancelReview =
  cancelReview;

window.confirmOrder =
  confirmOrder;

window.trackOrder =
  trackOrder;


/* =========================================================
   START
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    init
  );

} else {

  init();
}
