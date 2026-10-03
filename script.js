"use strict";

/* =========================================================
   DARDOMAMOGS — COMPLETE CORRECTED SCRIPT.JS
   =========================================================
   Products:
   • Mango Dardoma
   • Karkade Dardoma
   • Pepsi Dardoma

   Features:
   • Shopping cart
   • Product rendering
   • Store hours: 2 PM → 2 AM
   • Checkout
   • Review order
   • Google Forms submission
   • Google Sheets / Apps Script tracking
   • Order number + tracking code
   • Local order backup
   • Delivery status
   • Delivery map
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

    cartStorageKey:
        "dardoma_mogs_cart",

    ordersStorageKey:
        "dardoma_mogs_orders",

    lastOrderKey:
        "dardoma_mogs_last_order",

    googleFormAction:
        "https://docs.google.com/forms/d/e/1FAIpQLSfcFu09aQGcBszMQvutwk_huj8BK4CqtSwdU8HerbVei-lftw/formResponse",

    trackingApi:
        "https://script.google.com/macros/s/AKfycby9GyMIelR3lAnmaAaJlPBWMKw8v_SdIDuc6ZT_useCESQCM-TyPvXVYPG-JTOkB5WAVg/exec",

    googleFormEntries: {

        name:
            "entry.1661561910",

        contact:
            "entry.544821231",

        order:
            "entry.1211593112",

        notes:
            "entry.212349483",

        payment:
            "entry.412155072"
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

        description:
            "Sweet mango flavor."
    },


    karkade: {

        id: "karkade",

        name: "Karkade Dardoma",

        emoji: "❤️",

        price: 10,

        description:
            "Refreshing karkade flavor."
    },


    pepsi: {

        id: "pepsi",

        name: "Pepsi Dardoma",

        emoji: "🥤",

        price: 10,

        description:
            "Cool Pepsi flavor."
    }
};


/* =========================================================
   STATE
   ========================================================= */

let cart = loadCart();

let currentOrder = null;

let isSubmittingOrder = false;


/* =========================================================
   BASIC HELPERS
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

        toast =
            document.createElement("div");

        toast.id = "toast";

        Object.assign(
            toast.style,
            {
                position: "fixed",
                left: "50%",
                bottom: "25px",
                transform: "translateX(-50%)",
                zIndex: "99999",
                padding: "13px 20px",
                borderRadius: "14px",
                background: "#172018",
                color: "#fff",
                fontWeight: "800",
                boxShadow:
                    "0 12px 35px rgba(0,0,0,.25)",
                maxWidth: "90%",
                textAlign: "center"
            }
        );

        document.body.appendChild(toast);
    }

    toast.textContent = message;

    toast.hidden = false;

    clearTimeout(showToast.timer);

    showToast.timer =
        setTimeout(() => {

            toast.hidden = true;

        }, 3000);
}


/* =========================================================
   STORE HOURS
   ========================================================= */

function isStoreOpen() {

    const hour =
        new Date().getHours();

    /*
       Store is open:
       2 PM → midnight
       midnight → 2 AM
    */

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

        closedNotice.hidden =
            open;
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

        console.error(
            "Unknown product:",
            productId
        );

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
                element.tagName ===
                "SPAN"
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
                                    ${money(
                                        itemTotal
                                    )}
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

    const subtotal =
        $("subtotal");

    const delivery =
        $("deliveryFee");

    const total =
        $("cartTotal");


    if (subtotal) {

        subtotal.textContent =
            money(
                getSubtotal()
            );
    }


    if (delivery) {

        delivery.textContent =
            money(
                getDeliveryFee()
            );
    }


    if (total) {

        total.textContent =
            money(
                getTotal()
            );
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
   ORDER NUMBER
   ========================================================= */

function generateOrderNumber() {

    let orderNumber;

    let attempts = 0;


    do {

        const number =
            Math.floor(
                1000 +
                Math.random() * 9000
            );

        orderNumber =
            `DM-${number}`;

        attempts++;

    } while (
        orderExists(orderNumber) &&
        attempts < 100
    );


    return orderNumber;
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


        if (
            !Array.isArray(orders)
        ) {

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
   CREATE ORDER
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

function saveOrderLocally(
    order
) {

    let orders = [];


    try {

        orders =
            JSON.parse(
                localStorage.getItem(
                    CONFIG.ordersStorageKey
                ) || "[]"
            );


        if (
            !Array.isArray(orders)
        ) {

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

function formatGoogleFormOrder(
    order
) {

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
   GOOGLE FORM / IFRAME
   ========================================================= */

function createGoogleFormIframe() {

    /*
       Your current HTML uses:
       googleFormTarget
    */

    let iframe =
        $("googleFormTarget");


    if (!iframe) {

        iframe =
            document.createElement(
                "iframe"
            );

        iframe.id =
            "googleFormTarget";

        iframe.name =
            "googleFormTarget";

        iframe.className =
            "hidden-frame";

        iframe.title =
            "Order submission";

        iframe.style.display =
            "none";

        document.body.appendChild(
            iframe
        );
    }


    return iframe;
}


/* =========================================================
   GOOGLE FORM INPUT
   ========================================================= */

function ensureGoogleInput(
    form,
    id,
    name,
    value
) {

    let input =
        $(id);


    if (
        !input ||
        input.form !== form
    ) {

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

function submitGoogleForm(
    order
) {

    /*
       IMPORTANT:
       Current website HTML uses:

       id="googleOrderForm"

       NOT:
       realGoogleForm
    */

    const form =
        $("googleOrderForm");


    if (!form) {

        console.error(
            "googleOrderForm does not exist."
        );

        showToast(
            "The Google order form is missing."
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


    form.action =
        CONFIG.googleFormAction;

    form.method =
        "POST";

    form.target =
        "googleFormTarget";


    createGoogleFormIframe();


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


    const form =
        $("checkoutForm");


    if (!form) {

        showToast(
            "Checkout form could not be found."
        );

        return false;
    }


    if (!form.checkValidity()) {

        form.reportValidity();

        return false;
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


    let review =
        $("orderReview");


    if (!review) {

        review =
            document.createElement(
                "div"
            );

        review.id =
            "orderReview";

        review.className =
            "checkout-review";


        if (form.parentNode) {

            form.parentNode.insertBefore(
                review,
                form.nextSibling
            );
        }
    }


    const items =
        getCartItems();


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

                ${

                    items

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

                        .join("")

                }

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
                    ${money(
                        getTotal()
                    )}
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


    review.hidden =
        false;


    review.style.display =
        "";


    const editButton =
        $("editOrderButton");


    if (editButton) {

        editButton.onclick =
            function(event) {

                event.preventDefault();

                cancelReview();
            };
    }


    const confirmButton =
        $("finalConfirmOrderButton");


    if (confirmButton) {

        confirmButton.onclick =
            function(event) {

                event.preventDefault();

                confirmOrder();
            };
    }


    review.scrollIntoView({

        behavior:
            "smooth",

        block:
            "center"
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

    if (isSubmittingOrder) {

        return;
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

        showToast(
            "Checkout form not found."
        );

        return;
    }


    if (!form.checkValidity()) {

        form.reportValidity();

        return;
    }


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
           Create the order.
        */

        const order =
            createOrder();


        currentOrder =
            order;


        /*
           Save backup locally.
        */

        saveOrderLocally(
            order
        );


        /*
           Submit Google Form.
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
           Clear cart.
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
           Reset checkout form.
        */

        form.reset();


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
   ORDER SUCCESS
   ========================================================= */

function showOrderSuccess(
    order
) {

    let success =
        $("orderSuccess");


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

            behavior:
                "smooth"
        });


        return;
    }


    /*
       Fallback if the HTML doesn't
       already contain orderSuccess.
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

        behavior:
            "smooth"
    });
}


/* =========================================================
   TRACK ORDER
   ========================================================= */

async function trackOrder(
    event
) {

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
        !orderNumber ||
        !trackingCode
    ) {

        showToast(
            "Enter both your Order Number and Tracking Code."
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


        params.set(
            "orderNumber",
            orderNumber
        );


        params.set(
            "trackingCode",
            trackingCode
        );


        const url =
            `${CONFIG.trackingApi}?${params.toString()}`;


        const response =
            await fetch(

                url,

                {
                    method:
                        "GET",

                    cache:
                        "no-store"
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
            "Tracking API response:",
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


    /*
       FIXED RESPONSE FORMAT:

       Apps Script now returns:

       {
           success: true,
           found: true,
           order: {
               orderNumber,
               trackingCode,
               status,
               lastUpdated,
               latitude,
               longitude
           }
       }
    */

    if (
        !data ||
        data.success !== true ||
        !data.order
    ) {

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


    const order =
        data.order;


    const orderNumber =
        order.orderNumber || "";


    const trackingCode =
        order.trackingCode || "";


    const status =
        order.status ||
        "Order Received";


    const updated =
        order.lastUpdated ||
        "";


    const latitude =
        order.latitude;


    const longitude =
        order.longitude;


    let formattedUpdated =
        "";


    if (updated) {

        try {

            formattedUpdated =
                new Date(
                    updated
                ).toLocaleString();

        } catch {

            formattedUpdated =
                String(updated);
        }
    }


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
                formattedUpdated
                    ? `

                        <p>

                            <strong>
                                Last Updated:
                            </strong>

                            ${escapeHTML(
                                formattedUpdated
                            )}

                        </p>

                    `
                    : ""
            }


            <div class="timeline">

                ${renderTimeline(
                    status
                )}

            </div>

        </div>
    `;


    /*
       Show map only when the order
       is Out for Delivery.
    */

    if (
        String(status)
            .toLowerCase()
            .trim() ===
        "out for delivery"
    ) {

        const hasLocation =

            Number.isFinite(
                Number(latitude)
            ) &&

            Number.isFinite(
                Number(longitude)
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

                            <p>
                                📍 Delivery
                                location available.
                            </p>

                            <a
                                class="btn primary"
                                target="_blank"
                                rel="noopener"
                                href="https://www.openstreetmap.org/?mlat=${encodeURIComponent(
                                    latitude
                                )}&mlon=${encodeURIComponent(
                                    longitude
                                )}#map=17/${encodeURIComponent(
                                    latitude
                                )}/${encodeURIComponent(
                                    longitude
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
            (status, index) => {

                const completed =
                    currentIndex >= index;


                const active =
                    status ===
                    currentStatus;


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

                        ${escapeHTML(
                            status
                        )}

                    </div>
                `;
            }
        )

        .join("");
}


/* =========================================================
   CHECKOUT FORM SETUP
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
       Find Review button.
    */

    let reviewButton =
        $("reviewOrderButton");


    if (!reviewButton) {

        reviewButton =
            form.querySelector(
                "[data-review-order]"
            );
    }


    if (!reviewButton) {

        reviewButton =
            form.querySelector(
                'button[type="submit"]'
            );
    }


    if (reviewButton) {

        reviewButton.type =
            "button";


        /*
           Clone to remove any old
           conflicting click handler.
        */

        const replacement =
            reviewButton.cloneNode(
                true
            );


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
    }


    /*
       Update preview when checkout
       fields change.
    */

    [

        "customerName",

        "customerContact",

        "paymentMethod",

        "customerNotes"

    ].forEach(id => {

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

                        behavior:
                            "smooth"
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
        $("googleOrderForm");


    if (!form) {

        console.warn(
            "googleOrderForm not found on page."
        );

        return;
    }


    form.action =
        CONFIG.googleFormAction;


    form.method =
        "POST";


    form.target =
        "googleFormTarget";


    createGoogleFormIframe();
}


/* =========================================================
   INITIALIZE DARDOMAMOGS
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
   START WEBSITE
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
