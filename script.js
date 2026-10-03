"use strict";

/* =========================================================
   DARDOMAMOGS — SCRIPT.JS
   No Firebase
   Google Form ordering
   Local cart + local tracking
   Store hours: 2:00 PM → 2:00 AM
   Delivery fee: 20 EGP
   ========================================================= */


/* =========================================================
   CONFIG
   ========================================================= */

const CONFIG = {
    storeName: "DardomaMOGS",

    openingHour: 14, // 2 PM
    closingHour: 2,  // 2 AM

    deliveryFee: 20,

    cartStorageKey: "dardoma_mogs_new_cart",
    ordersStorageKey: "dardoma_mogs_orders",

    googleForm: {
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


/* =========================================================
   HELPERS
   ========================================================= */

const $ = id => document.getElementById(id);

function money(amount) {
    return `${amount.toFixed(2)} EGP`;
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   STORE HOURS
   ========================================================= */

function isStoreOpen() {
    const now = new Date();
    const hour = now.getHours();

    return hour >= CONFIG.openingHour || hour < CONFIG.closingHour;
}

function updateStoreStatus() {
    const open = isStoreOpen();

    const elements = document.querySelectorAll(
        "#storeStatus, #heroStatus, .store-status"
    );

    elements.forEach(element => {
        element.classList.toggle("closed", !open);

        if (element.id === "storeStatus") {
            element.textContent = open
                ? "🟢 We're Open"
                : "🔴 We're Closed";
        }
    });

    const heroStatus = $("heroStatus");

    if (heroStatus) {
        heroStatus.textContent = open
            ? "🟢 We're Open"
            : "🔴 We're Closed";
    }

    const closedNotice = $("closedNotice");

    if (closedNotice) {
        closedNotice.hidden = open;
    }
}


/* =========================================================
   CART STORAGE
   ========================================================= */

function loadCart() {
    try {
        const saved = localStorage.getItem(CONFIG.cartStorageKey);

        if (!saved) {
            return {};
        }

        const parsed = JSON.parse(saved);

        return parsed && typeof parsed === "object"
            ? parsed
            : {};
    } catch (error) {
        console.error("Could not load cart:", error);
        return {};
    }
}

function saveCart() {
    localStorage.setItem(
        CONFIG.cartStorageKey,
        JSON.stringify(cart)
    );
}


/* =========================================================
   CART CALCULATIONS
   ========================================================= */

function getCartItems() {
    return Object.values(cart)
        .filter(item => item && PRODUCTS[item.id])
        .map(item => ({
            ...item,
            product: PRODUCTS[item.id]
        }));
}

function getCartCount() {
    return getCartItems().reduce(
        (total, item) => total + item.quantity,
        0
    );
}

function getSubtotal() {
    return getCartItems().reduce(
        (total, item) =>
            total + item.product.price * item.quantity,
        0
    );
}

function getDeliveryFee() {
    return getCartItems().length > 0
        ? CONFIG.deliveryFee
        : 0;
}

function getTotal() {
    return getSubtotal() + getDeliveryFee();
}


/* =========================================================
   ADD TO CART
   ========================================================= */

function addToCart(productId, quantity = 1) {
    const product = PRODUCTS[productId];

    if (!product) {
        return;
    }

    quantity = Math.max(1, Number(quantity) || 1);

    if (!cart[productId]) {
        cart[productId] = {
            id: productId,
            quantity: 0
        };
    }

    cart[productId].quantity += quantity;

    saveCart();
    renderCart();
    updateCartCount();

    showToast(`${product.name} added to cart! 🥭`);

    scrollToCartIfNeeded();
}


/* =========================================================
   CHANGE QUANTITY
   ========================================================= */

function changeQuantity(productId, amount) {
    if (!cart[productId]) {
        return;
    }

    cart[productId].quantity += amount;

    if (cart[productId].quantity <= 0) {
        delete cart[productId];
    }

    saveCart();

    renderCart();
    updateCartCount();
}


/* =========================================================
   REMOVE ITEM
   ========================================================= */

function removeFromCart(productId) {
    if (!cart[productId]) {
        return;
    }

    const product = PRODUCTS[productId];

    delete cart[productId];

    saveCart();

    renderCart();
    updateCartCount();

    if (product) {
        showToast(`${product.name} removed.`);
    }
}


/* =========================================================
   CLEAR CART
   ========================================================= */

function clearCart() {
    if (getCartItems().length === 0) {
        return;
    }

    cart = {};

    saveCart();

    renderCart();
    updateCartCount();

    showToast("Cart cleared.");
}


/* =========================================================
   CART COUNT
   ========================================================= */

function updateCartCount() {
    const count = getCartCount();

    document.querySelectorAll(".cart-count, #cartCount").forEach(
        element => {
            element.textContent = count;
            element.hidden = count === 0;
        }
    );
}


/* =========================================================
   PRODUCT RENDERING
   ========================================================= */

function renderProducts() {
    const productGrid = $("productGrid");

    if (!productGrid) {
        return;
    }

    productGrid.innerHTML = Object.values(PRODUCTS)
        .map(product => `
            <article class="product-card">

                <div class="product-image">
                    ${product.emoji}
                </div>

                <div>
                    <h3>${escapeHTML(product.name)}</h3>

                    <p>
                        ${escapeHTML(product.description)}
                    </p>
                </div>

                <div class="price-row">

                    <span class="price">
                        ${money(product.price)}
                    </span>

                    <button
                        class="btn primary"
                        type="button"
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
   CART RENDERING
   ========================================================= */

function renderCart() {
    const cartItemsElement = $("cartItems");

    if (!cartItemsElement) {
        return;
    }

    const items = getCartItems();

    if (items.length === 0) {

        cartItemsElement.innerHTML = `
            <div class="empty-cart">

                <div class="empty-icon">
                    🛒
                </div>

                <h3>Your cart is empty</h3>

                <p>
                    Add some delicious Dardoma to get started!
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

        cartItemsElement.innerHTML = items
            .map(item => {

                const product = item.product;
                const itemTotal =
                    product.price * item.quantity;

                return `
                    <div class="cart-row">

                        <div class="cart-thumb">
                            ${product.emoji}
                        </div>

                        <div class="cart-info">

                            <h4>
                                ${escapeHTML(product.name)}
                            </h4>

                            <p>
                                ${money(product.price)} each
                            </p>

                            <div class="qty">

                                <button
                                    type="button"
                                    aria-label="Decrease quantity"
                                    onclick="changeQuantity('${product.id}', -1)"
                                >
                                    −
                                </button>

                                <strong>
                                    ${item.quantity}
                                </strong>

                                <button
                                    type="button"
                                    aria-label="Increase quantity"
                                    onclick="changeQuantity('${product.id}', 1)"
                                >
                                    +
                                </button>

                            </div>

                            <button
                                class="remove"
                                type="button"
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
   CART SUMMARY
   ========================================================= */

function renderSummary() {
    const subtotalElement = $("subtotal");
    const deliveryElement = $("deliveryFee");
    const totalElement = $("cartTotal");

    const subtotal = getSubtotal();
    const delivery = getDeliveryFee();
    const total = getTotal();

    if (subtotalElement) {
        subtotalElement.textContent = money(subtotal);
    }

    if (deliveryElement) {
        deliveryElement.textContent = money(delivery);
    }

    if (totalElement) {
        totalElement.textContent = money(total);
    }

    const checkoutButton = $("checkoutButton");

    if (checkoutButton) {
        checkoutButton.disabled =
            getCartItems().length === 0;
    }
}


/* =========================================================
   CHECKOUT
   ========================================================= */

function prepareCheckout() {
    if (getCartItems().length === 0) {
        showToast("Your cart is empty.");
        return;
    }

    const checkoutSection = $("checkout");

    if (checkoutSection) {
        checkoutSection.scrollIntoView({
            behavior: "smooth"
        });
    }

    renderCheckoutPreview();
}


/* =========================================================
   CHECKOUT PREVIEW
   ========================================================= */

function renderCheckoutPreview() {
    const preview = $("checkoutPreview");

    if (!preview) {
        return;
    }

    const items = getCartItems();

    if (items.length === 0) {
        preview.textContent =
            "Your cart is empty.";
        return;
    }

    const lines = items.map(item => {
        return `${item.quantity} × ${item.product.name} — ${money(
            item.product.price * item.quantity
        )}`;
    });

    lines.push("");
    lines.push(`Subtotal: ${money(getSubtotal())}`);
    lines.push(`Delivery: ${money(getDeliveryFee())}`);
    lines.push(`Total: ${money(getTotal())}`);

    preview.textContent = lines.join("\n");
}


/* =========================================================
   REVIEW ORDER
   ========================================================= */

function reviewOrder() {
    if (getCartItems().length === 0) {
        showToast("Your cart is empty.");
        return;
    }

    const form = $("checkoutForm");

    if (!form) {
        return;
    }

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const name = $("customerName")?.value.trim() || "";
    const contact = $("customerContact")?.value.trim() || "";
    const payment = $("paymentMethod")?.value || "";
    const notes = $("customerNotes")?.value.trim() || "";

    const review = $("orderReview");

    if (!review) {
        return;
    }

    const items = getCartItems();

    const itemLines = items.map(item =>
        `${item.quantity} × ${item.product.name} — ${money(
            item.product.price * item.quantity
        )}`
    );

    review.innerHTML = `
        <div class="review-card">

            <h3>Review Your Order</h3>

            <div class="review-details">

                <p>
                    <strong>Name:</strong>
                    ${escapeHTML(name)}
                </p>

                <p>
                    <strong>Contact:</strong>
                    ${escapeHTML(contact)}
                </p>

                <p>
                    <strong>Payment:</strong>
                    ${escapeHTML(payment)}
                </p>

                ${
                    notes
                        ? `
                            <p>
                                <strong>Notes:</strong>
                                ${escapeHTML(notes)}
                            </p>
                        `
                        : ""
                }

            </div>

            <div class="review-items">
                ${itemLines
                    .map(line => `<p>${escapeHTML(line)}</p>`)
                    .join("")}
            </div>

            <div class="review-total">
                <span>Total</span>
                <strong>${money(getTotal())}</strong>
            </div>

            <div class="review-actions">

                <button
                    type="button"
                    class="btn secondary"
                    onclick="cancelReview()"
                >
                    Edit Order
                </button>

                <button
                    type="button"
                    class="btn primary"
                    onclick="confirmOrder()"
                >
                    Confirm Order
                </button>

            </div>

        </div>
    `;

    review.hidden = false;

    review.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


/* =========================================================
   CANCEL REVIEW
   ========================================================= */

function cancelReview() {
    const review = $("orderReview");

    if (review) {
        review.hidden = true;
        review.innerHTML = "";
    }
}


/* =========================================================
   ORDER NUMBER
   ========================================================= */

function generateOrderNumber() {
    const random = Math.floor(
        1000 + Math.random() * 9000
    );

    return `DM-${random}`;
}


/* =========================================================
   TRACKING TOKEN
   ========================================================= */

function generateTrackingToken() {
    if (
        window.crypto &&
        crypto.getRandomValues
    ) {
        const array = new Uint32Array(2);

        crypto.getRandomValues(array);

        return (
            array[0].toString(36) +
            array[1].toString(36)
        ).toUpperCase();
    }

    return Math.random()
        .toString(36)
        .substring(2, 12)
        .toUpperCase();
}


/* =========================================================
   ORDER OBJECT
   ========================================================= */

function createOrder() {
    const items = getCartItems();

    const name =
        $("customerName")?.value.trim() || "";

    const contact =
        $("customerContact")?.value.trim() || "";

    const payment =
        $("paymentMethod")?.value || "";

    const notes =
        $("customerNotes")?.value.trim() || "";

    return {
        orderNumber: generateOrderNumber(),

        trackingToken: generateTrackingToken(),

        name,
        contact,
        payment,
        notes,

        items: items.map(item => ({
            id: item.product.id,
            name: item.product.name,
            quantity: item.quantity,
            price: item.product.price
        })),

        subtotal: getSubtotal(),

        deliveryFee: getDeliveryFee(),

        total: getTotal(),

        status: "Order Received",

        createdAt: new Date().toISOString(),

        timeline: {
            "Order Received": new Date().toISOString(),
            "Preparing": null,
            "Ready": null,
            "Out for Delivery": null,
            "Delivered": null
        }
    };
}


/* =========================================================
   SAVE LOCAL ORDER
   ========================================================= */

function saveOrderLocally(order) {
    let orders = [];

    try {
        const saved =
            localStorage.getItem(
                CONFIG.ordersStorageKey
            );

        if (saved) {
            orders = JSON.parse(saved);

            if (!Array.isArray(orders)) {
                orders = [];
            }
        }
    } catch {
        orders = [];
    }

    orders.push(order);

    localStorage.setItem(
        CONFIG.ordersStorageKey,
        JSON.stringify(orders)
    );
}


/* =========================================================
   SUBMIT GOOGLE FORM
   ========================================================= */

function submitGoogleForm(order) {
    const form = $("realGoogleForm");

    if (!form) {
        console.warn(
            "Google Form element was not found."
        );

        return;
    }

    const gName = $("gName");
    const gContact = $("gContact");
    const gOrder = $("gOrder");
    const gNotes = $("gNotes");
    const gPayment = $("gPayment");

    if (gName) {
        gName.value = order.name;
    }

    if (gContact) {
        gContact.value = order.contact;
    }

    if (gOrder) {
        gOrder.value = formatGoogleFormOrder(order);
    }

    if (gNotes) {
        gNotes.value =
            order.notes ||
            `Order Number: ${order.orderNumber}`;
    }

    if (gPayment) {
        gPayment.value = order.payment;
    }

    try {
        form.submit();

        console.log(
            "Google Form submitted successfully."
        );
    } catch (error) {
        console.error(
            "Google Form submission failed:",
            error
        );
    }
}


/* =========================================================
   GOOGLE FORM ORDER TEXT
   ========================================================= */

function formatGoogleFormOrder(order) {
    const items = order.items
        .map(item =>
            `${item.quantity} × ${item.name} — ${money(
                item.price * item.quantity
            )}`
        )
        .join("\n");

    return [
        `Order Number: ${order.orderNumber}`,
        "",
        items,
        "",
        `Subtotal: ${money(order.subtotal)}`,
        `Delivery: ${money(order.deliveryFee)}`,
        `Total: ${money(order.total)}`
    ].join("\n");
}


/* =========================================================
   CONFIRM ORDER
   ========================================================= */

function confirmOrder() {
    if (getCartItems().length === 0) {
        showToast("Your cart is empty.");
        return;
    }

    const form = $("checkoutForm");

    if (!form) {
        return;
    }

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const order = createOrder();

    currentOrder = order;

    saveOrderLocally(order);

    /*
       Submit to the existing Google Form.
       The hidden iframe prevents the user from
       leaving the DardomaMOGS website.
    */
    submitGoogleForm(order);

    showOrderSuccess(order);

    cart = {};

    saveCart();

    renderCart();
    updateCartCount();

    cancelReview();
}


/* =========================================================
   SUCCESS SCREEN
   ========================================================= */

function showOrderSuccess(order) {
    const success = $("orderSuccess");

    if (!success) {
        return;
    }

    const orderNumber =
        $("successOrderNumber");

    const trackingCode =
        $("successTrackingCode");

    if (orderNumber) {
        orderNumber.textContent =
            order.orderNumber;
    }

    if (trackingCode) {
        trackingCode.textContent =
            order.trackingToken;
    }

    success.innerHTML = `
        <div class="success-card">

            <div class="success-icon">
                🎉
            </div>

            <h2>
                Order Placed!
            </h2>

            <p>
                Thanks for ordering from
                <strong>DardomaMOGS</strong>!
            </p>

            <div class="success-info">

                <p>
                    <strong>Order Number</strong>
                </p>

                <div class="copy-box">
                    ${escapeHTML(order.orderNumber)}
                </div>

                <p>
                    <strong>Private Tracking Code</strong>
                </p>

                <div class="copy-box">
                    ${escapeHTML(order.trackingToken)}
                </div>

                <p class="small-note">
                    Keep these details so you can track
                    your order later.
                </p>

            </div>

            <div class="success-actions">

                <button
                    class="btn primary"
                    type="button"
                    onclick="goToTracking()"
                >
                    Track My Order
                </button>

                <button
                    class="btn secondary"
                    type="button"
                    onclick="startNewOrder()"
                >
                    New Order
                </button>

            </div>

        </div>
    `;

    success.hidden = false;

    success.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


/* =========================================================
   NEW ORDER
   ========================================================= */

function startNewOrder() {
    const success = $("orderSuccess");

    if (success) {
        success.hidden = true;
        success.innerHTML = "";
    }

    const form = $("checkoutForm");

    if (form) {
        form.reset();
    }

    const checkoutSection = $("checkout");

    if (checkoutSection) {
        checkoutSection.scrollIntoView({
            behavior: "smooth"
        });
    }
}


/* =========================================================
   TRACKING
   ========================================================= */

function findOrder(orderNumber, trackingToken) {
    let orders = [];

    try {
        orders = JSON.parse(
            localStorage.getItem(
                CONFIG.ordersStorageKey
            ) || "[]"
        );

        if (!Array.isArray(orders)) {
            return null;
        }
    } catch {
        return null;
    }

    return orders.find(order =>
        order.orderNumber.toUpperCase() ===
            orderNumber.toUpperCase() &&
        order.trackingToken.toUpperCase() ===
            trackingToken.toUpperCase()
    ) || null;
}


/* =========================================================
   TRACK ORDER
   ========================================================= */

function trackOrder(event) {
    if (event) {
        event.preventDefault();
    }

    const orderNumber =
        $("trackingOrderNumber")?.value.trim();

    const trackingToken =
        $("trackingCode")?.value.trim();

    if (!orderNumber || !trackingToken) {
        showToast(
            "Enter both your order number and tracking code."
        );

        return;
    }

    const order = findOrder(
        orderNumber,
        trackingToken
    );

    const result = $("trackingResult");

    if (!result) {
        return;
    }

    if (!order) {

        result.innerHTML = `
            <div class="status-card error-card">

                <h3>
                    Order Not Found
                </h3>

                <p>
                    Check your order number and private
                    tracking code and try again.
                </p>

                <p class="small-note">
                    Local tracking currently works in
                    the same browser where the order was placed.
                </p>

            </div>
        `;

        result.hidden = false;

        return;
    }

    renderTrackingResult(order);

    result.hidden = false;

    result.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


/* =========================================================
   TRACKING RESULT
   ========================================================= */

function renderTrackingResult(order) {
    const result = $("trackingResult");

    if (!result) {
        return;
    }

    const statuses = [
        "Order Received",
        "Preparing",
        "Ready",
        "Out for Delivery",
        "Delivered"
    ];

    const currentIndex =
        statuses.indexOf(order.status);

    const timeline = statuses
        .map((status, index) => {

            let state = "";

            if (index < currentIndex) {
                state = "completed";
            } else if (index === currentIndex) {
                state = "active";
            }

            const time =
                order.timeline?.[status];

            return `
                <div class="tracking-step ${state}">

                    <div class="tracking-dot">
                        ${
                            index < currentIndex
                                ? "✓"
                                : index === currentIndex
                                    ? "●"
                                    : ""
                        }
                    </div>

                    <div>
                        <strong>
                            ${escapeHTML(status)}
                        </strong>

                        ${
                            time
                                ? `
                                    <small>
                                        ${formatDate(time)}
                                    </small>
                                `
                                : ""
                        }
                    </div>

                </div>
            `;
        })
        .join("");

    const mapHTML =
        order.status === "Out for Delivery"
            ? `
                <div class="map-box">

                    <div class="map-placeholder">
                        🛵
                        <strong>
                            Your Dardoma is on the way!
                        </strong>

                        <span>
                            Live delivery mapping will appear
                            here when the delivery system is
                            connected.
                        </span>
                    </div>

                </div>
            `
            : "";

    result.innerHTML = `
        <div class="status-card">

            <h3>
                ${escapeHTML(order.status)}
            </h3>

            <p>
                Order
                <strong>
                    ${escapeHTML(order.orderNumber)}
                </strong>
            </p>

            <div class="timeline">
                ${timeline}
            </div>

            ${mapHTML}

        </div>
    `;
}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(dateString) {
    try {
        const date = new Date(dateString);

        return date.toLocaleString(
            "en-EG",
            {
                dateStyle: "medium",
                timeStyle: "short"
            }
        );
    } catch {
        return "";
    }
}


/* =========================================================
   GO TO TRACKING
   ========================================================= */

function goToTracking() {
    const trackingSection =
        $("tracking");

    if (trackingSection) {
        trackingSection.scrollIntoView({
            behavior: "smooth"
        });
    }

    if (currentOrder) {
        const orderInput =
            $("trackingOrderNumber");

        const codeInput =
            $("trackingCode");

        if (orderInput) {
            orderInput.value =
                currentOrder.orderNumber;
        }

        if (codeInput) {
            codeInput.value =
                currentOrder.trackingToken;
        }
    }
}


/* =========================================================
   TOAST
   ========================================================= */

let toastTimer = null;

function showToast(message) {
    let toast = $("toast");

    if (!toast) {
        toast = document.createElement("div");

        toast.id = "toast";

        toast.className = "toast";

        document.body.appendChild(toast);
    }

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}


/* =========================================================
   MOBILE MENU
   ========================================================= */

function setupMobileMenu() {
    const menuButton = $("menuButton");
    const mobileMenu = $("mobileMenu");

    if (!menuButton || !mobileMenu) {
        return;
    }

    menuButton.addEventListener("click", () => {
        const open =
            mobileMenu.classList.toggle("open");

        menuButton.setAttribute(
            "aria-expanded",
            String(open)
        );
    });

    mobileMenu
        .querySelectorAll("a")
        .forEach(link => {

            link.addEventListener("click", () => {
                mobileMenu.classList.remove("open");

                menuButton.setAttribute(
                    "aria-expanded",
                    "false"
                );
            });

        });
}


/* =========================================================
   PRODUCT QUERY PARAMETER
   ========================================================= */

function handleProductParameter() {
    const params =
        new URLSearchParams(
            window.location.search
        );

    const productId =
        params.get("product");

    if (!productId) {
        return;
    }

    if (!PRODUCTS[productId]) {
        return;
    }

    /*
       Wait briefly so the page has finished loading.
    */
    setTimeout(() => {

        addToCart(productId);

        const cartSection =
            $("cart");

        if (cartSection) {
            cartSection.scrollIntoView({
                behavior: "smooth"
            });
        }

    }, 500);
}


/* =========================================================
   CART SCROLL
   ========================================================= */

function scrollToCartIfNeeded() {
    /*
       Don't automatically move the page on desktop
       every time an item is added.

       The floating cart/navigation can be used instead.
    */
}


/* =========================================================
   CHECKOUT FORM LISTENERS
   ========================================================= */

function setupCheckout() {
    const form = $("checkoutForm");

    if (!form) {
        return;
    }

    form.addEventListener(
        "input",
        renderCheckoutPreview
    );

    form.addEventListener(
        "change",
        renderCheckoutPreview
    );
}


/* =========================================================
   BUTTON LISTENERS
   ========================================================= */

function setupButtons() {

    const checkoutButton =
        $("checkoutButton");

    if (checkoutButton) {
        checkoutButton.addEventListener(
            "click",
            prepareCheckout
        );
    }

    const reviewButton =
        $("reviewOrderButton");

    if (reviewButton) {
        reviewButton.addEventListener(
            "click",
            reviewOrder
        );
    }

    const clearButton =
        $("clearCartButton");

    if (clearButton) {
        clearButton.addEventListener(
            "click",
            clearCart
        );
    }

    const trackingForm =
        $("trackingForm");

    if (trackingForm) {
        trackingForm.addEventListener(
            "submit",
            trackOrder
        );
    }

}


/* =========================================================
   GOOGLE FORM IFRAME
   ========================================================= */

function setupGoogleFormIframe() {
    const iframe =
        $("googleFormFrame");

    if (!iframe) {
        return;
    }

    iframe.setAttribute(
        "aria-hidden",
        "true"
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

    setupMobileMenu();

    setupCheckout();

    setupButtons();

    setupGoogleFormIframe();

    handleProductParameter();

    /*
       Keep store status updated.
    */
    setInterval(
        updateStoreStatus,
        30000
    );

    /*
       If the page contains a saved order from this
       browser, keep it available for local tracking.
    */
    console.log(
        "DardomaMOGS loaded successfully."
    );
}


/* =========================================================
   START
   ========================================================= */

if (
    document.readyState === "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        init
    );
} else {
    init();
}


/* =========================================================
   GLOBAL FUNCTIONS
   =========================================================
   These are intentionally exposed so buttons in the
   HTML can call them.
   ========================================================= */

window.addToCart = addToCart;
window.changeQuantity = changeQuantity;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.prepareCheckout = prepareCheckout;
window.reviewOrder = reviewOrder;
window.cancelReview = cancelReview;
window.confirmOrder = confirmOrder;
window.trackOrder = trackOrder;
window.goToTracking = goToTracking;
window.startNewOrder = startNewOrder;
