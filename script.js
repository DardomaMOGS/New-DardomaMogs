"use strict";

/* =========================================================
   DARDOMAMOGS — SCRIPT.JS
   Real Google Sheets tracking
   No Firebase
   ========================================================= */

const CONFIG = {
    storeName: "DardomaMOGS",

    openingHour: 14,
    closingHour: 2,

    deliveryFee: 20,

    cartStorageKey: "dardoma_mogs_new_cart",
    ordersStorageKey: "dardoma_mogs_orders",

    /*
       YOUR GOOGLE APPS SCRIPT WEB APP
    */
    trackingApi:
        "https://script.google.com/macros/s/AKfycby9GyMIelR3lAnmaAaJlPBWMKw8v_SdIDuc6ZT_useCESQCM-TyPvXVYPG-JTOkB5WAVg/exec",

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
    return `${Number(amount).toFixed(2)} EGP`;
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

    return hour >= CONFIG.openingHour ||
           hour < CONFIG.closingHour;
}

function updateStoreStatus() {
    const open = isStoreOpen();

    document.querySelectorAll(
        "#storeStatus, #heroStatus, .store-status"
    ).forEach(element => {
        element.classList.toggle(
            "closed",
            !open
        );

        element.textContent = open
            ? "🟢 We're Open"
            : "🔴 We're Closed";
    });

    const closedNotice = $("closedNotice");

    if (closedNotice) {
        closedNotice.hidden = open;
    }
}


/* =========================================================
   CART
   ========================================================= */

function loadCart() {
    try {
        const saved =
            localStorage.getItem(
                CONFIG.cartStorageKey
            );

        if (!saved) {
            return {};
        }

        const parsed = JSON.parse(saved);

        return parsed &&
               typeof parsed === "object"
            ? parsed
            : {};
    } catch {
        return {};
    }
}

function saveCart() {
    localStorage.setItem(
        CONFIG.cartStorageKey,
        JSON.stringify(cart)
    );
}

function getCartItems() {
    return Object.values(cart)
        .filter(
            item =>
                item &&
                PRODUCTS[item.id]
        )
        .map(item => ({
            ...item,
            product: PRODUCTS[item.id]
        }));
}

function getCartCount() {
    return getCartItems().reduce(
        (total, item) =>
            total + item.quantity,
        0
    );
}

function getSubtotal() {
    return getCartItems().reduce(
        (total, item) =>
            total +
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
   ADD TO CART
   ========================================================= */

function addToCart(productId, quantity = 1) {
    const product =
        PRODUCTS[productId];

    if (!product) return;

    quantity =
        Math.max(
            1,
            Number(quantity) || 1
        );

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

    showToast(
        `${product.name} added to cart! 🥭`
    );
}


/* =========================================================
   QUANTITY
   ========================================================= */

function changeQuantity(
    productId,
    amount
) {
    if (!cart[productId]) {
        return;
    }

    cart[productId].quantity += amount;

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
   REMOVE
   ========================================================= */

function removeFromCart(productId) {
    if (!cart[productId]) return;

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
   CLEAR
   ========================================================= */

function clearCart() {
    if (
        getCartItems().length === 0
    ) {
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
    const count =
        getCartCount();

    document.querySelectorAll(
        ".cart-count, #cartCount"
    ).forEach(element => {
        element.textContent = count;
        element.hidden = count === 0;
    });
}


/* =========================================================
   PRODUCTS
   ========================================================= */

function renderProducts() {
    const grid =
        $("productGrid");

    if (!grid) return;

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
                            ${money(
                                product.price
                            )}
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
   CART RENDER
   ========================================================= */

function renderCart() {
    const container =
        $("cartItems");

    if (!container) return;

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
            items.map(item => {

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
            }).join("");
    }

    renderSummary();
}


/* =========================================================
   SUMMARY
   ========================================================= */

function renderSummary() {
    const subtotal =
        $("subtotal");

    const delivery =
        $("deliveryFee");

    const total =
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

    const button =
        $("checkoutButton");

    if (button) {
        button.disabled =
            getCartItems().length === 0;
    }
}


/* =========================================================
   CHECKOUT
   ========================================================= */

function prepareCheckout() {
    if (
        getCartItems().length === 0
    ) {
        showToast(
            "Your cart is empty."
        );

        return;
    }

    renderCheckoutPreview();

    const section =
        $("checkout");

    if (section) {
        section.scrollIntoView({
            behavior: "smooth"
        });
    }
}

function renderCheckoutPreview() {
    const preview =
        $("checkoutPreview");

    if (!preview) return;

    const items =
        getCartItems();

    const lines =
        items.map(item =>
            `${item.quantity} × ${
                item.product.name
            } — ${
                money(
                    item.product.price *
                    item.quantity
                )
            }`
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
   REVIEW
   ========================================================= */

function reviewOrder() {
    if (
        getCartItems().length === 0
    ) {
        showToast(
            "Your cart is empty."
        );

        return;
    }

    const form =
        $("checkoutForm");

    if (!form) return;

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const name =
        $("customerName")
            ?.value.trim() || "";

    const contact =
        $("customerContact")
            ?.value.trim() || "";

    const payment =
        $("paymentMethod")
            ?.value || "";

    const notes =
        $("customerNotes")
            ?.value.trim() || "";

    const review =
        $("orderReview");

    if (!review) return;

    const items =
        getCartItems();

    review.innerHTML = `
        <div class="review-card">

            <h3>
                Review Your Order
            </h3>

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

                ${
                    items.map(item => `
                        <p>
                            ${item.quantity}
                            ×
                            ${escapeHTML(
                                item.product.name
                            )}
                            —
                            ${money(
                                item.product.price *
                                item.quantity
                            )}
                        </p>
                    `).join("")
                }

            </div>

            <div class="review-total">

                <span>
                    Total
                </span>

                <strong>
                    ${money(getTotal())}
                </strong>

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

function cancelReview() {
    const review =
        $("orderReview");

    if (!review) return;

    review.hidden = true;
    review.innerHTML = "";
}


/* =========================================================
   ORDER IDENTIFIERS
   ========================================================= */

function generateOrderNumber() {
    const number =
        Math.floor(
            1000 +
            Math.random() * 9000
        );

    return `DM-${number}`;
}

function generateTrackingToken() {
    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 10; i++) {
        code += characters[
            Math.floor(
                Math.random() *
                characters.length
            )
        ];
    }

    return code;
}


/* =========================================================
   CREATE ORDER
   ========================================================= */

function createOrder() {
    const items =
        getCartItems();

    const name =
        $("customerName")
            ?.value.trim() || "";

    const contact =
        $("customerContact")
            ?.value.trim() || "";

    const payment =
        $("paymentMethod")
            ?.value || "";

    const notes =
        $("customerNotes")
            ?.value.trim() || "";

    return {
        orderNumber:
            generateOrderNumber(),

        trackingToken:
            generateTrackingToken(),

        name,
        contact,
        payment,
        notes,

        items:
            items.map(item => ({
                id: item.product.id,
                name: item.product.name,
                quantity: item.quantity,
                price: item.product.price
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
   SAVE LOCAL BACKUP
   ========================================================= */

function saveOrderLocally(order) {
    let orders = [];

    try {
        orders =
            JSON.parse(
                localStorage.getItem(
                    CONFIG.ordersStorageKey
                ) || "[]"
            );

        if (!Array.isArray(orders)) {
            orders = [];
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
   GOOGLE FORM
   ========================================================= */

function formatGoogleFormOrder(order) {

    const items =
        order.items.map(item =>
            `${item.quantity} × ${
                item.name
            } — ${
                money(
                    item.price *
                    item.quantity
                )
            }`
        ).join("\n");

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

function submitGoogleForm(order) {
    const form =
        $("realGoogleForm");

    if (!form) {
        console.warn(
            "Google Form not found."
        );

        return;
    }

    const gName =
        $("gName");

    const gContact =
        $("gContact");

    const gOrder =
        $("gOrder");

    const gNotes =
        $("gNotes");

    const gPayment =
        $("gPayment");

    if (gName) {
        gName.value =
            order.name;
    }

    if (gContact) {
        gContact.value =
            order.contact;
    }

    if (gOrder) {
        gOrder.value =
            formatGoogleFormOrder(
                order
            );
    }

    if (gNotes) {
        gNotes.value =
            [
                `Order Number: ${order.orderNumber}`,
                `Tracking Code: ${order.trackingToken}`,
                order.notes
            ]
                .filter(Boolean)
                .join("\n");
    }

    if (gPayment) {
        gPayment.value =
            order.payment;
    }

    try {
        form.submit();
    } catch (error) {
        console.error(
            "Google Form submission failed:",
            error
        );
    }
}


/* =========================================================
   CONFIRM ORDER
   ========================================================= */

function confirmOrder() {
    const form =
        $("checkoutForm");

    if (!form) return;

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    if (
        getCartItems().length === 0
    ) {
        showToast(
            "Your cart is empty."
        );

        return;
    }

    const order =
        createOrder();

    currentOrder =
        order;

    /*
       Save a local backup.
    */
    saveOrderLocally(order);

    /*
       Send the order to the
       existing Google Form.
    */
    submitGoogleForm(order);

    /*
       Show confirmation.
    */
    showOrderSuccess(order);

    /*
       Empty cart.
    */
    cart = {};

    saveCart();

    renderCart();
    updateCartCount();

    cancelReview();
}


/* =========================================================
   SUCCESS
   ========================================================= */

function showOrderSuccess(order) {
    const success =
        $("orderSuccess");

    if (!success) return;

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
                    <strong>
                        Order Number
                    </strong>
                </p>

                <div class="copy-box">
                    ${escapeHTML(
                        order.orderNumber
                    )}
                </div>

                <p>
                    <strong>
                        Private Tracking Code
                    </strong>
                </p>

                <div class="copy-box">
                    ${escapeHTML(
                        order.trackingToken
                    )}
                </div>

                <p class="small-note">
                    Keep these details so you
                    can track your order.
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
   REAL GOOGLE SHEETS TRACKING
   ========================================================= */

async function trackOrder(event) {
    if (event) {
        event.preventDefault();
    }

    const orderNumber =
        $("trackingOrderNumber")
            ?.value.trim();

    const trackingCode =
        $("trackingCode")
            ?.value.trim();

    const result =
        $("trackingResult");

    if (!result) return;

    if (
        !orderNumber ||
        !trackingCode
    ) {
        showToast(
            "Enter your order number and tracking code."
        );

        return;
    }

    result.hidden = false;

    result.innerHTML = `
        <div class="status-card">
            <h3>
                🔎 Looking for your order...
            </h3>

            <p>
                Checking DardomaMOGS tracking.
            </p>
        </div>
    `;

    try {

        const url =
            new URL(
                CONFIG.trackingApi
            );

        url.searchParams.set(
            "orderNumber",
            orderNumber
        );

        url.searchParams.set(
            "trackingCode",
            trackingCode
        );

        const response =
            await fetch(
                url.toString(),
                {
                    method: "GET",
                    cache: "no-store"
                }
            );

        if (!response.ok) {
            throw new Error(
                `Server returned ${response.status}`
            );
        }

        const data =
            await response.json();

        if (
            !data.success ||
            !data.order
        ) {
            result.innerHTML = `
                <div class="status-card error-card">

                    <h3>
                        ❌ Order Not Found
                    </h3>

                    <p>
                        Check your order number
                        and private tracking code.
                    </p>

                </div>
            `;

            return;
        }

        renderRealTracking(
            data.order
        );

    } catch (error) {

        console.error(
            "Tracking error:",
            error
        );

        result.innerHTML = `
            <div class="status-card error-card">

                <h3>
                    ⚠️ Tracking temporarily unavailable
                </h3>

                <p>
                    We couldn't connect to the
                    DardomaMOGS tracking system.
                </p>

                <p class="small-note">
                    Please try again in a moment.
                </p>

            </div>
        `;
    }
}


/* =========================================================
   REAL TRACKING RESULT
   ========================================================= */

function renderRealTracking(order) {
    const result =
        $("trackingResult");

    if (!result) return;

    const statuses = [
        "Order Received",
        "Preparing",
        "Ready",
        "Out for Delivery",
        "Delivered"
    ];

    const currentIndex =
        statuses.indexOf(
            order.status
        );

    const timeline =
        statuses.map(
            (status, index) => {

                let state = "";

                if (
                    index <
                    currentIndex
                ) {
                    state =
                        "completed";
                }

                if (
                    index ===
                    currentIndex
                ) {
                    state =
                        "active";
                }

                return `
                    <div
                        class="tracking-step ${state}"
                    >

                        <div
                            class="tracking-dot"
                        >
                            ${
                                index <
                                currentIndex
                                    ? "✓"
                                    : index ===
                                      currentIndex
                                        ? "●"
                                        : ""
                            }
                        </div>

                        <div>

                            <strong>
                                ${escapeHTML(
                                    status
                                )}
                            </strong>

                        </div>

                    </div>
                `;
            }
        ).join("");

    /*
       Only show the map area when
       the order is Out for Delivery.
    */

    let mapHTML = "";

    if (
        order.status ===
        "Out for Delivery"
    ) {

        const hasLocation =
            order.latitude !== "" &&
            order.latitude != null &&
            order.longitude !== "" &&
            order.longitude != null;

        if (hasLocation) {

            const lat =
                Number(
                    order.latitude
                );

            const lng =
                Number(
                    order.longitude
                );

            mapHTML = `
                <div class="map-box">

                    <div class="map-placeholder">

                        🛵

                        <strong>
                            Your Dardoma is on the way!
                        </strong>

                        <span>
                            Delivery location:
                            ${lat.toFixed(5)},
                            ${lng.toFixed(5)}
                        </span>

                    </div>

                </div>
            `;

        } else {

            mapHTML = `
                <div class="map-box">

                    <div class="map-placeholder">

                        🛵

                        <strong>
                            Your Dardoma is on the way!
                        </strong>

                        <span>
                            The delivery location
                            hasn't been added yet.
                        </span>

                    </div>

                </div>
            `;
        }
    }

    result.innerHTML = `
        <div class="status-card">

            <h3>
                ${escapeHTML(
                    order.status
                )}
            </h3>

            <p>
                Order
                <strong>
                    ${escapeHTML(
                        order.orderNumber
                    )}
                </strong>
            </p>

            <div class="timeline">
                ${timeline}
            </div>

            ${mapHTML}

        </div>
    `;

    result.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


/* =========================================================
   GO TO TRACKING
   ========================================================= */

function goToTracking() {
    const section =
        $("tracking");

    if (section) {
        section.scrollIntoView({
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
   NEW ORDER
   ========================================================= */

function startNewOrder() {
    const success =
        $("orderSuccess");

    if (success) {
        success.hidden = true;
        success.innerHTML = "";
    }

    const form =
        $("checkoutForm");

    if (form) {
        form.reset();
    }

    const checkout =
        $("checkout");

    if (checkout) {
        checkout.scrollIntoView({
            behavior: "smooth"
        });
    }
}


/* =========================================================
   TOAST
   ========================================================= */

let toastTimer;

function showToast(message) {
    let toast =
        $("toast");

    if (!toast) {

        toast =
            document.createElement(
                "div"
            );

        toast.id =
            "toast";

        toast.className =
            "toast";

        document.body.appendChild(
            toast
        );
    }

    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );

    clearTimeout(
        toastTimer
    );

    toastTimer =
        setTimeout(() => {
            toast.classList.remove(
                "show"
            );
        }, 2500);
}


/* =========================================================
   MOBILE MENU
   ========================================================= */

function setupMobileMenu() {
    const button =
        $("menuButton");

    const menu =
        $("mobileMenu");

    if (!button || !menu) {
        return;
    }

    button.addEventListener(
        "click",
        () => {

            const open =
                menu.classList.toggle(
                    "open"
                );

            button.setAttribute(
                "aria-expanded",
                String(open)
            );
        }
    );

    menu.querySelectorAll(
        "a"
    ).forEach(link => {

        link.addEventListener(
            "click",
            () => {

                menu.classList.remove(
                    "open"
                );

                button.setAttribute(
                    "aria-expanded",
                    "false"
                );
            }
        );

    });
}


/* =========================================================
   BUTTONS
   ========================================================= */

function setupButtons() {

    const checkout =
        $("checkoutButton");

    if (checkout) {
        checkout.addEventListener(
            "click",
            prepareCheckout
        );
    }

    const review =
        $("reviewOrderButton");

    if (review) {
        review.addEventListener(
            "click",
            reviewOrder
        );
    }

    const clear =
        $("clearCartButton");

    if (clear) {
        clear.addEventListener(
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
   CHECKOUT
   ========================================================= */

function setupCheckout() {
    const form =
        $("checkoutForm");

    if (!form) return;

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
   PRODUCT URL
   ========================================================= */

function handleProductParameter() {
    const params =
        new URLSearchParams(
            window.location.search
        );

    const productId =
        params.get(
            "product"
        );

    if (
        !productId ||
        !PRODUCTS[productId]
    ) {
        return;
    }

    setTimeout(() => {

        addToCart(
            productId
        );

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
   INITIALIZE
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

    handleProductParameter();

    setInterval(
        updateStoreStatus,
        30000
    );

    console.log(
        "DardomaMOGS loaded with Google Sheets tracking."
    );
}


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

window.goToTracking =
    goToTracking;

window.startNewOrder =
    startNewOrder;
