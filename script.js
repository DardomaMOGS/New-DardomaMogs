"use strict";

/* =========================================================
   DARDOMAMOGS — COMPLETE SCRIPT.JS
   Single shopping website
   Google Forms ordering
   Google Sheets / Apps Script tracking
   NO FIREBASE
   ========================================================= */


/* =========================================================
   CONFIG
   ========================================================= */

const CONFIG = {
    storeName: "DardomaMOGS",

    // Store: 2:00 PM → 2:00 AM
    openingHour: 14,
    closingHour: 2,

    // Delivery fee
    deliveryFee: 20,

    // Local storage
    cartStorageKey: "dardoma_mogs_cart",
    ordersStorageKey: "dardoma_mogs_orders",
    lastOrderKey: "dardoma_mogs_last_order",

    // Google Form
    googleFormAction:
        "https://docs.google.com/forms/d/e/1FAIpQLSfcFu09aQGcBszMQvutwk_huj8BK4CqtSwdU8HerbVei-lftw/formResponse",

    // Google Apps Script tracking API
    trackingApi:
        "https://script.google.com/macros/s/AKfycby9GyMIelR3lAnmaAaJlPBWMKw8v_SdIDuc6ZT_useCESQCM-TyPvXVYPG-JTOkB5WAVg/exec",

    // Exact Google Form entry IDs
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
let isSubmittingOrder = false;


/* =========================================================
   SHORTCUT
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}


/* =========================================================
   BASIC HELPERS
   ========================================================= */

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

        toast.style.position = "fixed";
        toast.style.left = "50%";
        toast.style.bottom = "25px";
        toast.style.transform = "translateX(-50%)";
        toast.style.zIndex = "99999";
        toast.style.padding = "13px 18px";
        toast.style.borderRadius = "12px";
        toast.style.background = "#172018";
        toast.style.color = "#fff";
        toast.style.fontWeight = "700";
        toast.style.boxShadow =
            "0 10px 30px rgba(0,0,0,.2)";
        toast.style.maxWidth = "90%";
        toast.style.textAlign = "center";

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
    const now = new Date();
    const hour = now.getHours();

    /*
       Open:
       14:00 → 23:59
       00:00 → 01:59

       Closed:
       02:00 → 13:59
    */

    return (
        hour >= CONFIG.openingHour ||
        hour < CONFIG.closingHour
    );
}


function updateStoreStatus() {
    const open = isStoreOpen();

    document
        .querySelectorAll(
            "#storeStatus, #heroStatus, .store-status"
        )
        .forEach(element => {

            element.classList.toggle(
                "closed",
                !open
            );

            element.textContent = open
                ? "🟢 We're Open"
                : "🔴 We're Closed";
        });

    const closedNotice =
        $("closedNotice");

    if (closedNotice) {
        closedNotice.hidden = open;
    }

    document
        .querySelectorAll(
            "[data-store-action]"
        )
        .forEach(button => {
            button.disabled = !open;
        });
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
   CART DATA
   ========================================================= */

function getCartItems() {
    return Object.values(cart)
        .filter(item =>
            item &&
            PRODUCTS[item.id] &&
            Number(item.quantity) > 0
        )
        .map(item => ({
            id: item.id,
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
    return getCartItems().length > 0
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

    if (!product) {
        console.error(
            "Unknown product:",
            productId
        );

        return;
    }

    /*
       Do not allow ordering while
       the store is closed.
    */

    if (!isStoreOpen()) {
        showToast(
            "🔴 DardomaMOGS is currently closed. We're open from 2:00 PM to 2:00 AM."
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
        Number(cart[productId].quantity) +
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
   REMOVE PRODUCT
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
            `${product.name} removed from cart.`
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

    showToast("Cart cleared.");
}


/* =========================================================
   CART COUNT
   ========================================================= */

function updateCartCount() {

    const count =
        getCartCount();

    document
        .querySelectorAll(
            ".cart-count, #cartCount, .nav-cart-count"
        )
        .forEach(element => {

            element.textContent =
                count;

            if (
                element.tagName === "SPAN"
            ) {
                element.hidden =
                    count === 0;
            }
        });
}


/* =========================================================
   PRODUCT RENDERING
   ========================================================= */

function renderProducts() {

    const grid =
        $("productGrid");

    if (!grid) {
        return;
    }

    grid.innerHTML =
        Object.values(PRODUCTS)
            .map(product => {

                return `
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
                `;
            })
            .join("");
}


/* =========================================================
   CART RENDERING
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

    const checkoutButton =
        $("checkoutButton");

    if (checkoutButton) {

        checkoutButton.disabled =
            getCartItems().length === 0;

    }
}


/* =========================================================
   CHECKOUT
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
            behavior: "smooth"
        });

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
   BUILD ORDER TEXT
   ========================================================= */

function formatGoogleFormOrder(order) {

    const itemsText =
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
        itemsText,
        "",
        `Subtotal: ${money(order.subtotal)}`,
        `Delivery: ${money(order.deliveryFee)}`,
        `Total: ${money(order.total)}`
    ].join("\n");
}


/* =========================================================
   CREATE ORDER NUMBER
   ========================================================= */

function generateOrderNumber() {

    const number =
        Math.floor(
            1000 +
            Math.random() * 9000
        );

    return `DM-${number}`;
}


/* =========================================================
   CREATE TRACKING CODE
   ========================================================= */

function generateTrackingToken() {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let result = "";

    for (let i = 0; i < 10; i++) {

        result +=
            characters[
                Math.floor(
                    Math.random() *
                    characters.length
                )
            ];
    }

    return result;
}


/* =========================================================
   CREATE ORDER OBJECT
   ========================================================= */

function createOrder() {

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
   SAVE ORDER LOCALLY
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

    try {

        localStorage.setItem(
            CONFIG.ordersStorageKey,
            JSON.stringify(orders)
        );

        localStorage.setItem(
            CONFIG.lastOrderKey,
            JSON.stringify(order)
        );

    } catch (error) {

        console.warn(
            "Could not save order:",
            error
        );
    }
}


/* =========================================================
   GOOGLE FORM — IMPORTANT FIX
   =========================================================

   We DO NOT use:

       form.submit()

   Instead, we create a hidden iframe and submit
   the Google Form directly into it.

   This prevents:
   - page navigation
   - form.submit() conflicts
   - the checkout page disappearing
   - the Google Form opening in the current tab
   ========================================================= */

function createGoogleFormIframe() {

    let iframe =
        $("googleFormSubmitFrame");

    if (iframe) {
        return iframe;
    }

    iframe =
        document.createElement("iframe");

    iframe.id =
        "googleFormSubmitFrame";

    iframe.name =
        "googleFormSubmitFrame";

    iframe.style.position =
        "fixed";

    iframe.style.width =
        "1px";

    iframe.style.height =
        "1px";

    iframe.style.border =
        "0";

    iframe.style.opacity =
        "0";

    iframe.style.pointerEvents =
        "none";

    iframe.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.appendChild(
        iframe
    );

    return iframe;
}


/* =========================================================
   SUBMIT GOOGLE FORM
   ========================================================= */

function submitGoogleForm(order) {

    const form =
        $("realGoogleForm");

    if (!form) {

        console.error(
            "realGoogleForm was not found."
        );

        showToast(
            "Order form is missing from the page."
        );

        return false;
    }

    const entries =
        CONFIG.googleFormEntries;

    /*
       Find existing hidden inputs.
    */

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


    /*
       Fill the existing inputs.
    */

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


    /*
       Make absolutely sure the correct
       Google Form entry names exist.
    */

    ensureInputName(
        form,
        "gName",
        entries.name,
        order.name
    );

    ensureInputName(
        form,
        "gContact",
        entries.contact,
        order.contact
    );

    ensureInputName(
        form,
        "gOrder",
        entries.order,
        formatGoogleFormOrder(order)
    );

    ensureInputName(
        form,
        "gNotes",
        entries.notes,
        [
            `Order Number: ${order.orderNumber}`,
            `Tracking Code: ${order.trackingToken}`,
            order.notes
        ]
            .filter(Boolean)
            .join("\n")
    );

    ensureInputName(
        form,
        "gPayment",
        entries.payment,
        order.payment
    );


    /*
       Set the exact Google Forms endpoint.
    */

    form.action =
        CONFIG.googleFormAction;

    form.method =
        "POST";

    form.target =
        "googleFormSubmitFrame";


    /*
       Create the iframe.
    */

    createGoogleFormIframe();


    /*
       Submit using the native HTMLFormElement
       prototype.

       This avoids any element named "submit"
       overriding the submit method.
    */

    try {

        HTMLFormElement
            .prototype
            .submit
            .call(form);

        console.log(
            "DardomaMOGS Google Form submitted:",
            order.orderNumber
        );

        return true;

    } catch (error) {

        console.error(
            "Google Form submission failed:",
            error
        );

        showToast(
            "The order could not be sent. Please try again."
        );

        return false;
    }
}


/* =========================================================
   ENSURE GOOGLE FORM INPUT
   ========================================================= */

function ensureInputName(
    form,
    id,
    name,
    value
) {

    let input =
        $(id);

    if (!input) {

        input =
            form.querySelector(
                `[name="${name}"]`
            );
    }

    if (!input) {

        input =
            document.createElement(
                "input"
            );

        input.type =
            "hidden";

        input.id =
            id;

        input.name =
            name;

        form.appendChild(
            input
        );
    }

    input.name =
        name;

    input.value =
        value ?? "";
}


/* =========================================================
   REVIEW ORDER
   ========================================================= */

function reviewOrder() {

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

        console.error(
            "checkoutForm not found."
        );

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

    const review =
        $("orderReview");

    if (!review) {

        console.error(
            "orderReview not found."
        );

        return;
    }

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

                ${items
                    .map(item => `
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
                    `)
                    .join("")}

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
                    id="finalConfirmOrderButton"
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

    const review =
        $("orderReview");

    if (!review) {
        return;
    }

    review.hidden =
        true;

    review.innerHTML =
        "";
}


/* =========================================================
   CONFIRM ORDER
   ========================================================= */

async function confirmOrder() {

    /*
       Prevent double-clicks.
    */

    if (isSubmittingOrder) {
        return;
    }

    /*
       Store check.
    */

    if (!isStoreOpen()) {

        showToast(
            "🔴 The store is closed right now."
        );

        return;
    }

    /*
       Cart check.
    */

    if (!getCartItems().length) {

        showToast(
            "Your cart is empty."
        );

        return;
    }

    /*
       Form check.
    */

    const checkoutForm =
        $("checkoutForm");

    if (!checkoutForm) {

        console.error(
            "checkoutForm not found."
        );

        return;
    }

    if (!checkoutForm.checkValidity()) {

        checkoutForm.reportValidity();

        return;
    }


    /*
       Lock button.
    */

    isSubmittingOrder =
        true;

    const confirmButton =
        $("finalConfirmOrderButton");

    if (confirmButton) {

        confirmButton.disabled =
            true;

        confirmButton.textContent =
            "Sending Order...";
    }


    try {

        /*
           Create order.
        */

        const order =
            createOrder();

        currentOrder =
            order;


        /*
           Save local backup first.
        */

        saveOrderLocally(
            order
        );


        /*
           Send to Google Forms.
        */

        const submitted =
            submitGoogleForm(
                order
            );

        if (!submitted) {

            throw new Error(
                "Google Form submission failed."
            );
        }


        /*
           Clear cart ONLY after the
           Google Form was successfully
           handed to the browser.
        */

        cart = {};

        saveCart();

        renderCart();

        updateCartCount();


        /*
           Hide review.
        */

        cancelReview();


        /*
           Show success.
        */

        showOrderSuccess(
            order
        );


        /*
           Reset checkout fields.
        */

        checkoutForm.reset();


        /*
           Save current order again.
        */

        try {

            localStorage.setItem(
                CONFIG.lastOrderKey,
                JSON.stringify(order)
            );

        } catch {}


        /*
           Log useful debugging information.
        */

        console.log(
            "DardomaMOGS order completed:",
            order
        );


    } catch (error) {

        console.error(
            "confirmOrder error:",
            error
        );

        showToast(
            "Something went wrong while sending the order."
        );

    } finally {

        isSubmittingOrder =
            false;

        if (confirmButton) {

            confirmButton.disabled =
                false;

            confirmButton.textContent =
                "Confirm Order";
        }
    }
}


/* =========================================================
   SUCCESS SCREEN
   ========================================================= */

function showOrderSuccess(order) {

    const success =
        $("orderSuccess");

    if (!success) {

        /*
           If the HTML doesn't have a success
           section, create a simple one.
        */

        const fallback =
            document.createElement(
                "section"
            );

        fallback.id =
            "orderSuccess";

        fallback.className =
            "section";

        fallback.innerHTML = `
            <div
                style="
                    max-width:700px;
                    margin:auto;
                    background:#fff;
                    border:1px solid #eadfca;
                    border-radius:24px;
                    padding:30px;
                    text-align:center;
                "
            >
                <div style="font-size:4rem">
                    🎉
                </div>

                <h2>
                    Order Placed!
                </h2>

                <p>
                    Thank you for ordering
                    from DardomaMOGS.
                </p>

                <p>
                    Order Number:
                    <strong>
                        ${escapeHTML(
                            order.orderNumber
                        )}
                    </strong>
                </p>

                <p>
                    Tracking Code:
                    <strong>
                        ${escapeHTML(
                            order.trackingToken
                        )}
                    </strong>
                </p>
            </div>
        `;

        document.body.appendChild(
            fallback
        );

        fallback.scrollIntoView({
            behavior: "smooth"
        });

        return;
    }


    /*
       Populate existing success section.
    */

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


    /*
       Also support common alternate IDs.
    */

    document
        .querySelectorAll(
            "[data-order-number]"
        )
        .forEach(element => {
            element.textContent =
                order.orderNumber;
        });

    document
        .querySelectorAll(
            "[data-tracking-code]"
        )
        .forEach(element => {
            element.textContent =
                order.trackingToken;
        });


    success.hidden =
        false;

    success.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* =========================================================
   TRACKING API
   ========================================================= */

async function trackOrder(event) {

    if (event) {
        event.preventDefault();
    }

    const orderInput =
        $("trackingOrderNumber");

    const trackingInput =
        $("trackingCode");

    const result =
        $("trackingResult");

    const orderNumber =
        orderInput
            ?.value
            .trim()
            .toUpperCase() || "";

    const trackingCode =
        trackingInput
            ?.value
            .trim()
            .toUpperCase() || "";


    if (!orderNumber && !trackingCode) {

        showToast(
            "Enter your order number or tracking code."
        );

        return;
    }


    if (result) {

        result.hidden =
            false;

        result.innerHTML = `
            <div class="status-card">
                <h3>
                    🔎 Looking up your order...
                </h3>

                <p>
                    Please wait a moment.
                </p>
            </div>
        `;
    }


    try {

        const params =
            new URLSearchParams();

        if (orderNumber) {
            params.set(
                "orderNumber",
                orderNumber
            );
        }

        if (trackingCode) {
            params.set(
                "trackingCode",
                trackingCode
            );
        }


        const url =
            `${CONFIG.trackingApi}?${params.toString()}`;


        const response =
            await fetch(
                url,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `Tracking request failed: ${response.status}`
            );
        }


        const data =
            await response.json();


        console.log(
            "Tracking response:",
            data
        );


        renderTrackingResult(
            data
        );


    } catch (error) {

        console.error(
            "Tracking error:",
            error
        );

        if (result) {

            result.innerHTML = `
                <div
                    class="status-card"
                    style="
                        background:#fff3ef;
                        border-color:#f0c9bf;
                    "
                >
                    <h3>
                        ⚠️ Could not load tracking
                    </h3>

                    <p>
                        Please check your order
                        number and tracking code,
                        then try again.
                    </p>

                    <p>
                        If the problem continues,
                        the tracking server may
                        need a moment to respond.
                    </p>
                </div>
            `;
        }
    }
}


/* =========================================================
   RENDER TRACKING RESULT
   ========================================================= */

function renderTrackingResult(data) {

    const result =
        $("trackingResult");

    if (!result) {
        return;
    }


    /*
       Support both:
       {success:true,...}
       and
       {found:true,...}
    */

    const success =
        data &&
        (
            data.success === true ||
            data.found === true
        );


    if (!success) {

        result.innerHTML = `
            <div
                class="status-card"
                style="
                    background:#fff3ef;
                    border-color:#f0c9bf;
                "
            >

                <h3>
                    ❌ Order not found
                </h3>

                <p>
                    We couldn't find that order.
                </p>

                <p>
                    Check your Order Number
                    and Tracking Code.
                </p>

            </div>
        `;

        return;
    }


    const orderNumber =
        data.orderNumber ||
        data.order_number ||
        "";

    const trackingCode =
        data.trackingCode ||
        data.tracking_code ||
        "";

    const status =
        data.status ||
        "Order Received";

    const updated =
        data.lastUpdated ||
        data.last_updated ||
        "";


    let html = `

        <div class="status-card">

            <h3>
                ${escapeHTML(status)}
            </h3>

            <p>
                <strong>
                    Order:
                </strong>
                ${escapeHTML(orderNumber)}
            </p>

            <p>
                <strong>
                    Tracking Code:
                </strong>
                ${escapeHTML(trackingCode)}
            </p>

            ${
                updated
                    ? `
                        <p>
                            <strong>
                                Last Updated:
                            </strong>
                            ${escapeHTML(updated)}
                        </p>
                    `
                    : ""
            }

            <div class="timeline">

                ${renderTimeline(status)}

            </div>

        </div>
    `;


    /*
       Map ONLY when the order is
       Out for Delivery.
    */

    if (
        String(status)
            .toLowerCase() ===
        "out for delivery"
    ) {

        const latitude =
            data.latitude ??
            data.deliveryLatitude ??
            data.delivery_latitude;

        const longitude =
            data.longitude ??
            data.deliveryLongitude ??
            data.delivery_longitude;


        html += `
            <div
                class="status-card"
                style="margin-top:15px;"
            >

                <h3>
                    🚚 Your Order Is Out for Delivery
                </h3>

                <p>
                    Your delivery is currently
                    on the way.
                </p>

                ${
                    latitude &&
                    longitude
                        ? `
                            <p>
                                📍 Delivery location
                                is available.
                            </p>

                            <a
                                class="btn primary"
                                target="_blank"
                                rel="noopener"
                                href="https://www.openstreetmap.org/?mlat=${encodeURIComponent(latitude)}&mlon=${encodeURIComponent(longitude)}#map=17/${encodeURIComponent(latitude)}/${encodeURIComponent(longitude)}"
                            >
                                Open Delivery Map
                            </a>
                        `
                        : `
                            <p>
                                📍 The delivery location
                                has not been added yet.
                            </p>
                        `
                }

            </div>
        `;
    }


    result.innerHTML =
        html;
}


/* =========================================================
   TRACKING TIMELINE
   ========================================================= */

function renderTimeline(currentStatus) {

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
        .map((status, index) => {

            let symbol = "○";

            if (
                currentIndex >= index
            ) {
                symbol = "✓";
            }

            const active =
                status === currentStatus;

            return `
                <div
                    style="
                        ${
                            active
                                ? "font-weight:900;"
                                : ""
                        }
                    "
                >
                    ${symbol}
                    ${escapeHTML(status)}
                </div>
            `;

        })
        .join("");
}


/* =========================================================
   MOBILE MENU
   ========================================================= */

function setupMobileMenu() {

    const menuButton =
        $("menuButton");

    const mobileMenu =
        $("mobileMenu");


    if (
        !menuButton ||
        !mobileMenu
    ) {
        return;
    }


    menuButton.addEventListener(
        "click",
        () => {

            mobileMenu.classList.toggle(
                "open"
            );

        }
    );


    mobileMenu
        .querySelectorAll("a")
        .forEach(link => {

            link.addEventListener(
                "click",
                () => {

                    mobileMenu.classList.remove(
                        "open"
                    );

                }
            );

        });
}


/* =========================================================
   SMOOTH NAVIGATION
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

                    const targetId =
                        link.getAttribute(
                            "href"
                        );

                    if (
                        !targetId ||
                        targetId === "#"
                    ) {
                        return;
                    }

                    const target =
                        document.querySelector(
                            targetId
                        );

                    if (!target) {
                        return;
                    }

                    event.preventDefault();

                    target.scrollIntoView({
                        behavior: "smooth"
                    });

                }
            );

        });
}


/* =========================================================
   CHECKOUT FORM SETUP
   ========================================================= */

function setupCheckoutForm() {

    const form =
        $("checkoutForm");

    if (!form) {
        return;
    }


    /*
       IMPORTANT:
       Prevent normal browser submission.
       We handle checkout ourselves.
    */

    form.addEventListener(
        "submit",
        event => {

            event.preventDefault();

            reviewOrder();

        }
    );


    /*
       Update preview when checkout
       information changes.
    */

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
   TRACKING FORM SETUP
   ========================================================= */

function setupTrackingForm() {

    const form =
        $("trackingForm");

    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        trackOrder
    );
}


/* =========================================================
   CHECKOUT BUTTON
   ========================================================= */

function setupCheckoutButton() {

    const button =
        $("checkoutButton");

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        prepareCheckout
    );
}


/* =========================================================
   CLEAR CART BUTTON
   ========================================================= */

function setupClearCartButton() {

    const button =
        $("clearCartButton");

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        clearCart
    );
}


/* =========================================================
   STORE STATUS CLOCK
   ========================================================= */

function startStoreStatusClock() {

    updateStoreStatus();

    /*
       Check every 30 seconds so the
       store automatically changes from
       closed → open at 2 PM and
       open → closed at 2 AM.
    */

    setInterval(
        updateStoreStatus,
        30000
    );
}


/* =========================================================
   LOAD LAST ORDER
   ========================================================= */

function loadLastOrder() {

    try {

        const saved =
            localStorage.getItem(
                CONFIG.lastOrderKey
            );

        if (!saved) {
            return null;
        }

        return JSON.parse(saved);

    } catch {

        return null;
    }
}


/* =========================================================
   SHOW LAST ORDER BUTTON
   ========================================================= */

function setupLastOrder() {

    const lastOrder =
        loadLastOrder();

    if (!lastOrder) {
        return;
    }

    document
        .querySelectorAll(
            "[data-last-order]"
        )
        .forEach(element => {

            element.textContent =
                lastOrder.orderNumber;
        });

    document
        .querySelectorAll(
            "[data-last-tracking]"
        )
        .forEach(element => {

            element.textContent =
                lastOrder.trackingToken;
        });
}


/* =========================================================
   INITIALIZE
   ========================================================= */

function initializeDardomaMOGS() {

    console.log(
        "🥭 DardomaMOGS loading..."
    );

    renderProducts();

    renderCart();

    updateCartCount();

    renderCheckoutPreview();

    setupMobileMenu();

    setupNavigation();

    setupCheckoutForm();

    setupTrackingForm();

    setupCheckoutButton();

    setupClearCartButton();

    setupLastOrder();

    startStoreStatusClock();

    /*
       Make sure Google Form exists
       and has the correct action.
    */

    const googleForm =
        $("realGoogleForm");

    if (googleForm) {

        googleForm.action =
            CONFIG.googleFormAction;

        googleForm.method =
            "POST";

        googleForm.target =
            "googleFormSubmitFrame";
    }

    console.log(
        "🥭 DardomaMOGS ready!"
    );
}


/* =========================================================
   GLOBAL FUNCTIONS
   =========================================================

   These are required because some of the
   HTML buttons use onclick="..."
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

window.renderTrackingResult =
    renderTrackingResult;


/* =========================================================
   START
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeDardomaMOGS
    );

} else {

    initializeDardomaMOGS();

}
