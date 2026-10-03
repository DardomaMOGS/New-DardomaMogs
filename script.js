"use strict";

/* =========================================================
   DARDOMAMOGS — SCRIPT.JS
   Complete version
   Google Forms + Google Sheets tracking
   NO FIREBASE
   ========================================================= */


/* =========================================================
   CONFIG
   ========================================================= */

const CONFIG = {
    storeName: "DardomaMOGS",

    openingHour: 14,
    closingHour: 2,

    deliveryFee: 20,

    cartStorageKey: "dardoma_mogs_new_cart",
    ordersStorageKey: "dardoma_mogs_orders",

    trackingApi:
        "https://script.google.com/macros/s/AKfycby9GyMIelR3lAnmaAaJlPBWMKw8v_SdIDuc6ZT_useCESQCM-TyPvXVYPG-JTOkB5WAVg/exec",

    googleFormAction:
        "https://docs.google.com/forms/d/e/1FAIpQLSfcFu09aQGcBszMQvutwk_huj8BK4CqtSwdU8HerbVei-lftw/formResponse",

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
let toastTimer = null;


/* =========================================================
   BASIC HELPERS
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

    const hour = new Date().getHours();

    return (
        hour >= CONFIG.openingHour ||
        hour < CONFIG.closingHour
    );
}


function updateStoreStatus() {

    const open = isStoreOpen();

    const status = $("storeStatus");

    if (status) {

        status.textContent = open
            ? "🟢 We're Open"
            : "🔴 We're Closed";

        status.classList.toggle(
            "closed",
            !open
        );
    }
}


/* =========================================================
   CART STORAGE
   ========================================================= */

function loadCart() {

    try {

        let saved =
            localStorage.getItem(
                CONFIG.cartStorageKey
            );

        /*
         * Also check the older cart key
         * so previous carts aren't lost.
         */

        if (!saved) {

            saved =
                localStorage.getItem(
                    "dardoma_cart"
                );
        }

        if (!saved) {
            return {};
        }

        const parsed =
            JSON.parse(saved);

        if (
            !parsed ||
            typeof parsed !== "object"
        ) {
            return {};
        }

        return parsed;

    } catch (error) {

        console.warn(
            "Could not load cart:",
            error
        );

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
            "Could not save cart:",
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
            ...item,
            quantity: Number(item.quantity),
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
   CART COUNT
   ========================================================= */

function updateCartCount() {

    const count =
        getCartCount();

    const ids = [
        "navCartCount",
        "floatingCartCount"
    ];

    ids.forEach(id => {

        const element = $(id);

        if (element) {
            element.textContent = count;
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

    cart[productId].quantity +=
        quantity;

    saveCart();

    renderCart();

    updateCartCount();

    showToast(
        `${product.name} added to cart! 🥭`
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

    cart[productId].quantity +=
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
   REMOVE ITEM
   ========================================================= */

function removeFromCart(productId) {

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

    if (!getCartItems().length) {
        return;
    }

    cart = {};

    saveCart();

    renderCart();

    updateCartCount();

    showToast(
        "Cart cleared."
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
   CART DISPLAY
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
        $("summarySubtotal");

    const delivery =
        $("summaryDelivery");

    const total =
        $("summaryTotal");

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
   GO TO CHECKOUT
   ========================================================= */

function prepareCheckout() {

    if (!isStoreOpen()) {

        showToast(
            "🔴 DardomaMOGS is closed right now."
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

    const section =
        $("checkout");

    if (section) {

        section.scrollIntoView({
            behavior: "smooth"
        });
    }
}


/* =========================================================
   REVIEW ORDER
   ========================================================= */

function reviewOrder(event) {

    if (event) {
        event.preventDefault();
    }

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

    const form =
        $("checkoutForm");

    if (!form) {
        return;
    }

    if (!form.checkValidity()) {

        form.reportValidity();

        return;
    }

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

    const reviewPanel =
        $("reviewPanel");

    const reviewContent =
        $("reviewContent");

    if (
        !reviewPanel ||
        !reviewContent
    ) {
        return;
    }

    const items =
        getCartItems();

    reviewContent.innerHTML = `

        <div class="review-details">

            <p>
                <strong>Customer:</strong>
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

            ${items.map(item => `

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        gap:15px;
                        padding:7px 0;
                    "
                >

                    <span>
                        ${item.quantity}
                        ×
                        ${escapeHTML(
                            item.product.name
                        )}
                    </span>

                    <strong>
                        ${money(
                            item.product.price *
                            item.quantity
                        )}
                    </strong>

                </div>

            `).join("")}

        </div>

        <div
            class="review-total"
            style="
                display:flex;
                justify-content:space-between;
                border-top:1px solid #eadfca;
                margin-top:15px;
                padding-top:15px;
            "
        >

            <strong>
                Total
            </strong>

            <strong>
                ${money(getTotal())}
            </strong>

        </div>
    `;

    form.classList.add("hidden");

    reviewPanel.classList.remove(
        "hidden"
    );

    reviewPanel.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


/* =========================================================
   EDIT ORDER
   ========================================================= */

function editOrder() {

    const reviewPanel =
        $("reviewPanel");

    const form =
        $("checkoutForm");

    if (reviewPanel) {

        reviewPanel.classList.add(
            "hidden"
        );
    }

    if (form) {

        form.classList.remove(
            "hidden"
        );

        form.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}


/* =========================================================
   ORDER NUMBER
   ========================================================= */

function generateOrderNumber() {

    const number =
        Math.floor(
            1000 +
            Math.random() *
            9000
        );

    return `DM-${number}`;
}


/* =========================================================
   TRACKING CODE
   ========================================================= */

function generateTrackingToken() {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (
        let i = 0;
        i < 10;
        i++
    ) {

        code +=
            characters[
                Math.floor(
                    Math.random() *
                    characters.length
                )
            ];
    }

    return code;
}


/* =========================================================
   CREATE ORDER OBJECT
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
   LOCAL BACKUP
   ========================================================= */

function saveOrderLocally(order) {

    try {

        let orders =
            JSON.parse(
                localStorage.getItem(
                    CONFIG.ordersStorageKey
                ) || "[]"
            );

        if (!Array.isArray(orders)) {
            orders = [];
        }

        orders.push(order);

        localStorage.setItem(
            CONFIG.ordersStorageKey,
            JSON.stringify(orders)
        );

    } catch (error) {

        console.warn(
            "Could not save order locally:",
            error
        );
    }
}


/* =========================================================
   GOOGLE FORM ORDER TEXT
   ========================================================= */

function formatGoogleFormOrder(order) {

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

function submitGoogleForm(order) {

    const form =
        $("googleOrderForm");

    if (!form) {

        console.error(
            "googleOrderForm was not found."
        );

        showToast(
            "The order form could not be found."
        );

        return false;
    }

    const iframe =
        $("googleFormTarget");

    if (!iframe) {

        console.error(
            "googleFormTarget was not found."
        );

        showToast(
            "The order submission system could not be found."
        );

        return false;
    }


    /* Fill fields */

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

        gNotes.value = [

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


    /* Configure form */

    form.action =
        CONFIG.googleFormAction;

    form.method =
        "POST";

    form.target =
        "googleFormTarget";


    /* Submit using native form method */

    try {

        HTMLFormElement
            .prototype
            .submit
            .call(form);

        console.log(
            "DardomaMOGS Google Form submission sent.",
            order.orderNumber
        );

        return true;

    } catch (error) {

        console.error(
            "Google Form submission failed:",
            error
        );

        showToast(
            "Something went wrong while sending the order."
        );

        return false;
    }
}


/* =========================================================
   CONFIRM ORDER
   ========================================================= */

function confirmOrder() {

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

    const form =
        $("checkoutForm");

    if (
        !form ||
        !form.checkValidity()
    ) {

        if (form) {
            form.reportValidity();
        }

        return;
    }


    /* Create order */

    const order =
        createOrder();

    currentOrder =
        order;


    /*
     * Send to Google Form.
     */

    const submitted =
        submitGoogleForm(order);

    if (!submitted) {

        /*
         * DO NOT clear the cart if
         * submission could not start.
         */

        return;
    }


    /*
     * Keep local backup.
     */

    saveOrderLocally(order);


    /*
     * Show success.
     */

    showOrderSuccess(order);


    /*
     * Clear cart.
     */

    cart = {};

    saveCart();

    renderCart();

    updateCartCount();
}


/* =========================================================
   SUCCESS PANEL
   ========================================================= */

function showOrderSuccess(order) {

    const successPanel =
        $("successPanel");

    const successText =
        $("successText");

    const form =
        $("checkoutForm");

    const reviewPanel =
        $("reviewPanel");

    if (
        !successPanel ||
        !successText
    ) {
        return;
    }

    successText.innerHTML = `

        <strong>
            Order ${escapeHTML(
                order.orderNumber
            )}
        </strong>
        has been sent successfully! 🎉

        <br><br>

        Your private tracking code is:

        <br>

        <strong>
            ${escapeHTML(
                order.trackingToken
            )}
        </strong>

        <br><br>

        Keep this code so you can track
        your Dardoma order.

    `;

    if (form) {

        form.classList.add(
            "hidden"
        );
    }

    if (reviewPanel) {

        reviewPanel.classList.add(
            "hidden"
        );
    }

    successPanel.classList.remove(
        "hidden"
    );

    successPanel.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


/* =========================================================
   TRACK ORDER
   ========================================================= */

async function trackOrder() {

    const orderNumber =
        $("trackingOrder")
            ?.value
            .trim() || "";

    const trackingCode =
        $("trackingToken")
            ?.value
            .trim() || "";

    const result =
        $("trackingResult");

    if (!result) {
        return;
    }

    if (
        !orderNumber ||
        !trackingCode
    ) {

        showToast(
            "Enter your order number and tracking code."
        );

        return;
    }

    result.classList.remove(
        "hidden"
    );

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
                    We couldn't connect to
                    the DardomaMOGS tracking system.
                </p>

                <p class="small-note">
                    Please try again in a moment.
                </p>

            </div>

        `;
    }
}


/* =========================================================
   RENDER TRACKING
   ========================================================= */

function renderRealTracking(order) {

    const result =
        $("trackingResult");

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
        statuses.indexOf(
            order.status
        );


    const timeline =
        statuses
            .map(
                (status, index) => {

                    let state = "";

                    if (
                        currentIndex >= 0 &&
                        index < currentIndex
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
                                    index < currentIndex
                                        ? "✓"
                                        : index === currentIndex
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
            )
            .join("");


    /* =====================================================
       MAP — ONLY WHEN OUT FOR DELIVERY
       ===================================================== */

    let mapHTML = "";


    if (
        order.status ===
        "Out for Delivery"
    ) {

        const lat =
            Number(order.latitude);

        const lng =
            Number(order.longitude);


        if (
            Number.isFinite(lat) &&
            Number.isFinite(lng)
        ) {

            const delta =
                0.005;

            const bbox =
                [
                    lng - delta,
                    lat - delta,
                    lng + delta,
                    lat + delta
                ].join(",");

            const mapURL =
                `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
                    bbox
                )}&layer=mapnik&marker=${encodeURIComponent(
                    `${lat},${lng}`
                )}`;


            mapHTML = `

                <div class="map-box">

                    <div class="map-placeholder">

                        <strong>
                            🛵 Your Dardoma is on the way!
                        </strong>

                        <iframe
                            src="${mapURL}"
                            width="100%"
                            height="300"
                            style="
                                border:0;
                                border-radius:15px;
                                margin-top:15px;
                            "
                            loading="lazy"
                            title="Dardoma delivery map"
                        ></iframe>

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
                    order.status ||
                    "Order Received"
                )}
            </h3>

            <p>

                Order

                <strong>
                    ${escapeHTML(
                        order.orderNumber ||
                        ""
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
   MOBILE MENU
   ========================================================= */

function setupMobileMenu() {

    const button =
        $("menuToggle");

    const menu =
        $("mainNav");

    if (
        !button ||
        !menu
    ) {
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


    menu
        .querySelectorAll("a")
        .forEach(link => {

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
   BUTTON SETUP
   ========================================================= */

function setupButtons() {

    /* Continue to checkout */

    const checkoutButton =
        $("goCheckout");

    if (checkoutButton) {

        checkoutButton.addEventListener(
            "click",
            prepareCheckout
        );
    }


    /* Clear cart */

    const clearButton =
        $("clearCart");

    if (clearButton) {

        clearButton.addEventListener(
            "click",
            clearCart
        );
    }


    /* Checkout form */

    const checkoutForm =
        $("checkoutForm");

    if (checkoutForm) {

        checkoutForm.addEventListener(
            "submit",
            reviewOrder
        );

        checkoutForm.addEventListener(
            "input",
            renderCheckoutPreview
        );

        checkoutForm.addEventListener(
            "change",
            renderCheckoutPreview
        );
    }


    /* Edit order */

    const editButton =
        $("editOrder");

    if (editButton) {

        editButton.addEventListener(
            "click",
            editOrder
        );
    }


    /* Confirm order */

    const confirmButton =
        $("confirmOrder");

    if (confirmButton) {

        confirmButton.addEventListener(
            "click",
            confirmOrder
        );
    }


    /* Track */

    const trackButton =
        $("trackButton");

    if (trackButton) {

        trackButton.addEventListener(
            "click",
            trackOrder
        );
    }
}


/* =========================================================
   PRODUCT URL SUPPORT
   ========================================================= */

function handleProductParameter() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const productId =
        params.get("product");

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

    setupButtons();

    handleProductParameter();


    /*
     * Update store status every 30 seconds.
     */

    setInterval(
        updateStoreStatus,
        30000
    );


    console.log(
        "DardomaMOGS loaded successfully."
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

window.editOrder =
    editOrder;

window.confirmOrder =
    confirmOrder;

window.trackOrder =
    trackOrder;
