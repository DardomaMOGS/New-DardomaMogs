"use strict";

/* =========================================================
   DARDOMAMOGS — COMPLETE SCRIPT.JS
   ---------------------------------------------------------
   • Shopping cart
   • Product rendering
   • Store hours: 2 PM → 2 AM
   • Checkout
   • Review Order
   • Confirm Order
   • Google Forms submission
   • Google Sheets / Apps Script tracking
   • Order number + tracking code
   • Local order backup
   • Delivery status
   • Mobile menu
   • No Firebase
   ========================================================= */


/* =========================================================
   CONFIG
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
let isSubmittingOrder = false;


/* =========================================================
   HELPER
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

        toast.style.position = "fixed";
        toast.style.left = "50%";
        toast.style.bottom = "25px";
        toast.style.transform = "translateX(-50%)";
        toast.style.zIndex = "99999";
        toast.style.padding = "13px 20px";
        toast.style.borderRadius = "14px";
        toast.style.background = "#172018";
        toast.style.color = "#fff";
        toast.style.fontWeight = "800";
        toast.style.boxShadow =
            "0 12px 35px rgba(0,0,0,.25)";
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

    const closedNotice =
        $("closedNotice");

    if (closedNotice) {
        closedNotice.hidden = open;
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
            "Cart loading error:",
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
            "Cart saving error:",
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
   CART RENDER
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
   PREPARE CHECKOUT
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

    const lines =
        getCartItems().map(item =>
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
   CREATE ORDER NUMBER
   ========================================================= */

function generateOrderNumber() {

    let number;
    let exists = true;

    while (exists) {

        number =
            Math.floor(
                1000 +
                Math.random() * 9000
            );

        const orderNumber =
            `DM-${number}`;

        exists =
            orderExists(
                orderNumber
            );

        if (!exists) {
            return orderNumber;
        }
    }
}


/* =========================================================
   CHECK EXISTING ORDER
   ========================================================= */

function orderExists(orderNumber) {

    try {

        const orders =
            JSON.parse(
                localStorage.getItem(
                    CONFIG.ordersStorageKey
                ) || "[]"
            );

        if (!Array.isArray(orders)) {
            return false;
        }

        return orders.some(
            order =>
                order &&
                order.orderNumber ===
                    orderNumber
        );

    } catch {

        return false;
    }
}


/* =========================================================
   TRACKING CODE
   ========================================================= */

function generateTrackingToken() {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 10; i++) {

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
   GOOGLE FORM ORDER TEXT
   ========================================================= */

function formatGoogleFormOrder(order) {

    const itemLines =
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
        itemLines,
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
   CREATE HIDDEN GOOGLE FORM IFRAME
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
   ENSURE FORM INPUT
   ========================================================= */

function ensureGoogleInput(
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
   SUBMIT GOOGLE FORM
   ========================================================= */

function submitGoogleForm(order) {

    const form =
        $("realGoogleForm");

    if (!form) {

        console.error(
            "realGoogleForm does not exist."
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

    const notesText =
        [
            `Order Number: ${order.orderNumber}`,
            `Tracking Code: ${order.trackingToken}`,
            order.notes
        ]
            .filter(Boolean)
            .join("\n");


    /*
       Create/repair every required
       Google Form field.
    */

    ensureGoogleInput(
        form,
        "gName",
        entries.name,
        order.name
    );

    ensureGoogleInput(
        form,
        "gContact",
        entries.contact,
        order.contact
    );

    ensureGoogleInput(
        form,
        "gOrder",
        entries.order,
        orderText
    );

    ensureGoogleInput(
        form,
        "gNotes",
        entries.notes,
        notesText
    );

    ensureGoogleInput(
        form,
        "gPayment",
        entries.payment,
        order.payment
    );


    /*
       Configure the real Google Forms
       endpoint.
    */

    form.action =
        CONFIG.googleFormAction;

    form.method =
        "POST";

    form.target =
        "googleFormSubmitFrame";


    /*
       Make sure the iframe exists.
    */

    createGoogleFormIframe();


    /*
       DEBUG LOG.
    */

    console.log(
        "Sending DardomaMOGS order:",
        {
            orderNumber:
                order.orderNumber,

            trackingCode:
                order.trackingToken,

            name:
                order.name,

            contact:
                order.contact,

            payment:
                order.payment
        }
    );


    /*
       IMPORTANT:
       Use the native form prototype so
       an element named "submit" cannot
       break the submission.
    */

    try {

        HTMLFormElement
            .prototype
            .submit
            .call(form);

        console.log(
            "Google Form POST sent."
        );

        return true;

    } catch (error) {

        console.error(
            "Google Form POST failed:",
            error
        );

        return false;
    }
}


/* =========================================================
   REVIEW ORDER
   ========================================================= */

function reviewOrder() {

    console.log(
        "Review Order clicked."
    );


    /*
       Check store.
    */

    if (!isStoreOpen()) {

        showToast(
            "🔴 The store is closed right now."
        );

        return false;
    }


    /*
       Check cart.
    */

    if (!getCartItems().length) {

        showToast(
            "Your cart is empty."
        );

        return false;
    }


    /*
       Find form.
    */

    const form =
        $("checkoutForm");

    if (!form) {

        console.error(
            "checkoutForm was not found."
        );

        showToast(
            "Checkout form could not be found."
        );

        return false;
    }


    /*
       Validate required fields.
    */

    if (!form.checkValidity()) {

        form.reportValidity();

        return false;
    }


    /*
       Get customer data.
    */

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


    /*
       Find review area.
    */

    let review =
        $("orderReview");


    /*
       If the HTML does not contain
       orderReview, create it.
    */

    if (!review) {

        review =
            document.createElement(
                "div"
            );

        review.id =
            "orderReview";

        review.className =
            "checkout-review";

        form.parentNode.insertBefore(
            review,
            form.nextSibling
        );
    }


    const items =
        getCartItems();


    /*
       Build review.
    */

    review.innerHTML = `

        <div class="review-card">

            <h3>
                🧾 Review Your Order
            </h3>

            <div class="review-details">

                <p>
                    <strong>
                        Customer:
                    </strong>
                    ${escapeHTML(name)}
                </p>

                <p>
                    <strong>
                        Contact:
                    </strong>
                    ${escapeHTML(contact)}
                </p>

                <p>
                    <strong>
                        Payment:
                    </strong>
                    ${escapeHTML(payment)}
                </p>

                ${
                    notes
                        ? `
                            <p>
                                <strong>
                                    Notes:
                                </strong>
                                ${escapeHTML(notes)}
                            </p>
                        `
                        : ""
                }

            </div>

            <div class="review-items">

                ${items
                    .map(item => `

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

                    `)
                    .join("")}

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

            <div
                class="review-actions"
                style="
                    display:flex;
                    gap:10px;
                    flex-wrap:wrap;
                    margin-top:20px;
                "
            >

                <button
                    type="button"
                    class="btn secondary"
                    id="editOrderButton"
                >
                    ← Edit Order
                </button>

                <button
                    type="button"
                    class="btn primary"
                    id="finalConfirmOrderButton"
                >
                    Confirm Order
                </button>

            </div>

        </div>
    `;


    /*
       Show review.
    */

    review.hidden =
        false;

    review.style.display =
        "";


    /*
       Edit button.
    */

    const editButton =
        $("editOrderButton");

    if (editButton) {

        editButton.onclick =
            function(event) {

                event.preventDefault();

                cancelReview();
            };
    }


    /*
       Confirm button.
    */

    const confirmButton =
        $("finalConfirmOrderButton");

    if (confirmButton) {

        confirmButton.onclick =
            function(event) {

                event.preventDefault();

                confirmOrder();
            };
    }


    /*
       Scroll to review.
    */

    review.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });


    return true;
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

    review.style.display =
        "none";
}


/* =========================================================
   CONFIRM ORDER
   ========================================================= */

async function confirmOrder() {

    console.log(
        "Confirm Order clicked."
    );


    /*
       Prevent double click.
    */

    if (isSubmittingOrder) {

        console.log(
            "Order already being submitted."
        );

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
       Validate checkout.
    */

    const form =
        $("checkoutForm");

    if (!form) {

        showToast(
            "Checkout form not found."
        );

        return;
    }

    if (!form.checkValidity()) {

        form.reportValidity();

        return;
    }


    /*
       Lock submission.
    */

    isSubmittingOrder =
        true;

    const button =
        $("finalConfirmOrderButton");

    if (button) {

        button.disabled =
            true;

        button.textContent =
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
           Save local backup.
        */

        saveOrderLocally(
            order
        );


        /*
           Send to Google Forms.
        */

        const sent =
            submitGoogleForm(
                order
            );

        if (!sent) {

            throw new Error(
                "Google Form submission failed."
            );
        }


        /*
           Clear cart only after
           successful browser POST.
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
           Reset customer form.
        */

        form.reset();


        console.log(
            "DardomaMOGS order successfully sent:",
            order
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

        isSubmittingOrder =
            false;

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "Confirm Order";
        }
    }
}


/* =========================================================
   SUCCESS
   ========================================================= */

function showOrderSuccess(order) {

    let success =
        $("orderSuccess");


    /*
       If HTML already has the section,
       use it.
    */

    if (success) {

        success.hidden =
            false;

        const number =
            $("successOrderNumber");

        const tracking =
            $("successTrackingCode");

        if (number) {
            number.textContent =
                order.orderNumber;
        }

        if (tracking) {
            tracking.textContent =
                order.trackingToken;
        }

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

        success.scrollIntoView({
            behavior: "smooth"
        });

        return;
    }


    /*
       Fallback success section.
    */

    success =
        document.createElement(
            "section"
        );

    success.id =
        "orderSuccess";

    success.className =
        "section";

    success.innerHTML = `

        <div
            style="
                max-width:700px;
                margin:auto;
                background:#fff;
                border:1px solid #eadfca;
                border-radius:24px;
                padding:35px;
                text-align:center;
                box-shadow:0 16px 45px rgba(69,48,14,.10);
            "
        >

            <div
                style="
                    font-size:4rem;
                    margin-bottom:10px;
                "
            >
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
                <strong>
                    Order Number
                </strong>
                <br>
                ${escapeHTML(
                    order.orderNumber
                )}
            </p>

            <p>
                <strong>
                    Tracking Code
                </strong>
                <br>
                ${escapeHTML(
                    order.trackingToken
                )}
            </p>

            <p>
                Keep these details so
                you can track your order.
            </p>

        </div>
    `;

    document.body.appendChild(
        success
    );

    success.scrollIntoView({
        behavior: "smooth"
    });
}


/* =========================================================
   TRACK ORDER
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


    if (
        !orderNumber &&
        !trackingCode
    ) {

        showToast(
            "Enter your Order Number or Tracking Code."
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
                    Please wait.
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
                `Tracking server returned ${response.status}`
            );
        }


        const data =
            await response.json();


        console.log(
            "Tracking data:",
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
                        ⚠️ Tracking unavailable
                    </h3>

                    <p>
                        We couldn't connect to
                        the tracking system.
                    </p>

                    <p>
                        Please check your
                        Order Number and
                        Tracking Code.
                    </p>

                </div>
            `;
        }
    }
}


/* =========================================================
   TRACKING RESULT
   ========================================================= */

function renderTrackingResult(data) {

    const result =
        $("trackingResult");

    if (!result) {
        return;
    }


    const found =
        data &&
        (
            data.success === true ||
            data.found === true
        );


    if (!found) {

        result.innerHTML = `

            <div
                class="status-card"
                style="
                    background:#fff3ef;
                    border-color:#f0c9bf;
                "
            >

                <h3>
                    ❌ Order Not Found
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

    const latitude =
        data.latitude ??
        data.deliveryLatitude ??
        data.delivery_latitude;

    const longitude =
        data.longitude ??
        data.deliveryLongitude ??
        data.delivery_longitude;


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
       Map only appears when
       Out for Delivery.
    */

    if (
        String(status)
            .toLowerCase()
            .trim() ===
        "out for delivery"
    ) {

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
                    latitude &&
                    longitude
                        ? `

                            <p>
                                📍 Delivery
                                location available.
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
                                📍 Delivery location
                                hasn't been added yet.
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

            const completed =
                currentIndex >= index;

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

                    ${
                        completed
                            ? "✓"
                            : "○"
                    }

                    ${escapeHTML(status)}

                </div>
            `;

        })
        .join("");
}


/* =========================================================
   CHECKOUT FORM
   =========================================================

   THIS IS THE IMPORTANT REVIEW BUTTON FIX.

   It handles:
   • form submit
   • Review Order button
   • buttons with data-review-order
   • buttons inside checkout form
   ========================================================= */

function setupCheckoutForm() {

    const form =
        $("checkoutForm");

    if (!form) {

        console.warn(
            "checkoutForm not found."
        );

        return;
    }


    /*
       Prevent normal form submission.
    */

    form.addEventListener(
        "submit",
        function(event) {

            event.preventDefault();

            event.stopPropagation();

            reviewOrder();

            return false;
        }
    );


    /*
       Find the Review button.
    */

    let reviewButton =
        $("reviewOrderButton");


    if (!reviewButton) {

        reviewButton =
            form.querySelector(
                '[data-review-order]'
            );
    }


    if (!reviewButton) {

        reviewButton =
            form.querySelector(
                'button[type="submit"]'
            );
    }


    /*
       If found, force it to behave
       as a Review button.
    */

    if (reviewButton) {

        reviewButton.type =
            "button";


        /*
           Remove previous click handlers
           by cloning the button.
        */

        const replacement =
            reviewButton.cloneNode(true);

        reviewButton.parentNode.replaceChild(
            replacement,
            reviewButton
        );


        replacement.type =
            "button";


        replacement.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                event.stopPropagation();

                reviewOrder();

            }
        );

    } else {

        console.warn(
            "Review Order button not found."
        );
    }


    /*
       Update checkout preview
       whenever fields change.
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
   TRACKING FORM
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
        function(event) {

            event.preventDefault();

            prepareCheckout();
        }
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
        function(event) {

            event.preventDefault();

            clearCart();
        }
    );
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
        function() {

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
                function() {

                    mobileMenu.classList.remove(
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
                function(event) {

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
   STORE CLOCK
   ========================================================= */

function startStoreClock() {

    updateStoreStatus();

    setInterval(
        updateStoreStatus,
        30000
    );
}


/* =========================================================
   LAST ORDER
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

        return JSON.parse(
            saved
        );

    } catch {

        return null;
    }
}


/* =========================================================
   LAST ORDER DISPLAY
   ========================================================= */

function setupLastOrder() {

    const order =
        loadLastOrder();

    if (!order) {
        return;
    }

    document
        .querySelectorAll(
            "[data-last-order]"
        )
        .forEach(element => {

            element.textContent =
                order.orderNumber;
        });


    document
        .querySelectorAll(
            "[data-last-tracking]"
        )
        .forEach(element => {

            element.textContent =
                order.trackingToken;
        });
}


/* =========================================================
   GOOGLE FORM INITIALIZATION
   ========================================================= */

function setupGoogleForm() {

    const form =
        $("realGoogleForm");

    if (!form) {

        console.warn(
            "realGoogleForm not found on page."
        );

        return;
    }

    form.action =
        CONFIG.googleFormAction;

    form.method =
        "POST";

    form.target =
        "googleFormSubmitFrame";

    createGoogleFormIframe();
}


/* =========================================================
   INITIALIZE WEBSITE
   ========================================================= */

function initializeDardomaMOGS() {

    console.log(
        "🥭 DardomaMOGS initializing..."
    );


    renderProducts();

    renderCart();

    updateCartCount();

    renderCheckoutPreview();


    setupCheckoutForm();

    setupTrackingForm();

    setupCheckoutButton();

    setupClearCartButton();

    setupMobileMenu();

    setupNavigation();

    setupGoogleForm();

    setupLastOrder();

    startStoreClock();


    console.log(
        "🥭 DardomaMOGS is ready!"
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
        initializeDardomaMOGS
    );

} else {

    initializeDardomaMOGS();
}
