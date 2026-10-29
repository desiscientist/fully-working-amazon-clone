const cartCount = document.querySelector("#cart-count");
const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#search-input");
const categorySelect = searchForm.querySelector("select");
const productCards = [...document.querySelectorAll(".product-card")];
const emptyState = document.querySelector("#empty-state");
const storeDialog = document.querySelector("#store-dialog");
const dialogTitle = document.querySelector("#dialog-title");
const deliveryLocationButton = document.querySelector("#delivery-location");
const deliveryLabel = document.querySelector("#delivery-label");
const deliveryStatus = document.querySelector("#delivery-status");
const dialogPanels = {
  account: document.querySelector("#account-panel"),
  cart: document.querySelector("#cart-panel"),
  orders: document.querySelector("#orders-panel"),
};

const cart = new Map();
const orders = [];
let signedInEmail = "";
let detectedLocation = null;

deliveryLocationButton.addEventListener("click", () => {
  if (!window.isSecureContext) {
    deliveryStatus.textContent = "Location detection requires a secure page (HTTPS or localhost).";
    return;
  }

  if (!("geolocation" in navigator)) {
    deliveryStatus.textContent = "Location detection is not supported by this browser.";
    return;
  }

  deliveryLocationButton.disabled = true;
  deliveryStatus.textContent = "Waiting for location permission...";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      detectedLocation = { latitude, longitude };
      deliveryLabel.textContent = "Location detected";
      deliveryStatus.textContent = `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
      const locationField = document.querySelector("#delivery-coordinates");
      locationField.value = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      document.querySelector("#detected-location").hidden = false;
      deliveryLocationButton.disabled = false;
    },
    (error) => {
      const messages = {
        1: "Location permission was denied. Allow it in your browser settings to try again.",
        2: "Your location is currently unavailable. Please try again.",
        3: "Location request timed out. Please try again.",
      };
      deliveryStatus.textContent = messages[error.code] || "Could not detect your location. Please try again.";
      deliveryLocationButton.disabled = false;
    },
    { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 },
  );
});

function openDialog(panelName, title) {
  dialogTitle.textContent = title;
  Object.entries(dialogPanels).forEach(([name, panel]) => {
    panel.hidden = name !== panelName;
  });
  storeDialog.showModal();
}

function updateCart() {
  const cartItems = document.querySelector("#cart-items");
  const cartEmpty = document.querySelector("#cart-empty");
  const cartSummary = document.querySelector("#cart-summary");
  const addressForm = document.querySelector("#address-form");
  const checkoutNote = document.querySelector("#checkout-note");
  cartItems.replaceChildren();

  let totalItems = 0;
  let totalPrice = 0;

  cart.forEach((item, key) => {
    totalItems += item.quantity;
    totalPrice += item.price * item.quantity;

    const row = document.createElement("div");
    row.className = "cart-item";
    const details = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = item.name;
    const price = document.createElement("small");
    price.textContent = `$${item.price.toFixed(2)} each`;
    details.append(name, price);

    const controls = document.createElement("div");
    controls.className = "quantity-controls";
    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.textContent = "−";
    decrease.setAttribute("aria-label", `Remove one ${item.name}`);
    decrease.addEventListener("click", () => changeQuantity(key, -1));
    const quantity = document.createElement("span");
    quantity.textContent = item.quantity;
    const increase = document.createElement("button");
    increase.type = "button";
    increase.textContent = "+";
    increase.setAttribute("aria-label", `Add one ${item.name}`);
    increase.addEventListener("click", () => changeQuantity(key, 1));
    controls.append(decrease, quantity, increase);
    row.append(details, controls);
    cartItems.append(row);
  });

  cartCount.textContent = totalItems;
  cartEmpty.hidden = cart.size > 0;
  cartSummary.hidden = cart.size === 0;
  addressForm.hidden = cart.size === 0;
  checkoutNote.hidden = cart.size === 0;
  document.querySelector("#cart-total").textContent = `$${totalPrice.toFixed(2)}`;
}

function changeQuantity(key, amount) {
  const item = cart.get(key);
  if (!item) return;
  item.quantity += amount;
  if (item.quantity <= 0) cart.delete(key);
  updateCart();
}

function renderOrders() {
  const orderList = document.querySelector("#order-list");
  const ordersEmpty = document.querySelector("#orders-empty");
  orderList.replaceChildren();
  ordersEmpty.hidden = orders.length > 0;

  orders.forEach((order) => {
    const card = document.createElement("article");
    card.className = "order-card";
    const heading = document.createElement("strong");
    heading.textContent = `Order ${order.number}`;
    const date = document.createElement("small");
    date.textContent = order.date;
    const contents = document.createElement("p");
    contents.textContent = order.items.map((item) => `${item.name} × ${item.quantity}`).join(", ");
    const total = document.createElement("strong");
    total.textContent = `Total: $${order.total.toFixed(2)}`;
    const payment = document.createElement("p");
    payment.textContent = `Payment: ${order.payment}`;
    const status = document.createElement("small");
    status.className = `order-status ${order.status === "Cancelled" ? "cancelled" : ""}`;
    status.textContent = `Status: ${order.status}`;
    card.append(heading, date, status, payment, contents);

    if (order.status === "Placed") {
      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "cancel-order";
      cancelButton.textContent = "Cancel order";
      cancelButton.addEventListener("click", () => {
        order.status = "Cancelled";
        renderOrders();
      });
      card.append(cancelButton);
    }

    const address = document.createElement("p");
    address.textContent = `Deliver to: ${order.address}`;
    card.append(total, address);
    if (order.coordinates) {
      const coordinates = document.createElement("p");
      coordinates.textContent = `GPS coordinates: ${order.coordinates.latitude.toFixed(6)}, ${order.coordinates.longitude.toFixed(6)}`;
      card.append(coordinates);
    }
    orderList.append(card);
  });
}

document.querySelectorAll(".add-to-cart").forEach((button) => {
  button.addEventListener("click", () => {
    const product = button.closest(".product-card");
    const key = product.dataset.name;
    const name = product.querySelector("h3").textContent;
    const price = Number(product.querySelector(".price-row strong").textContent.replace("$", ""));
    const item = cart.get(key);
    if (item) item.quantity += 1;
    else cart.set(key, { name, price, quantity: 1 });
    updateCart();
    button.textContent = "Added to cart";
    button.classList.add("added");
    window.setTimeout(() => {
      button.textContent = "Add to cart";
      button.classList.remove("added");
    }, 1000);
  });
});

document.querySelector("#account-button").addEventListener("click", () => {
  const accountForm = document.querySelector("#account-form");
  const signedInPanel = document.querySelector("#signed-in-panel");
  accountForm.hidden = Boolean(signedInEmail);
  signedInPanel.hidden = !signedInEmail;
  document.querySelector("#signed-in-email").textContent = signedInEmail;
  openDialog("account", signedInEmail ? "Your account" : "Sign in");
});

document.querySelector("#account-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const accountForm = event.currentTarget;
  if (!accountForm.reportValidity()) return;
  const emailInput = document.querySelector("#account-email");
  signedInEmail = emailInput.value.trim();
  document.querySelector("#account-password").value = "";
  document.querySelector("#account-greeting").textContent = `Hello, ${signedInEmail.split("@")[0]}`;
  accountForm.hidden = true;
  document.querySelector("#signed-in-panel").hidden = false;
  document.querySelector("#signed-in-email").textContent = signedInEmail;
});

document.querySelector("#sign-out-button").addEventListener("click", () => {
  signedInEmail = "";
  document.querySelector("#account-greeting").textContent = "Hello, sign in";
  storeDialog.close();
});

document.querySelector("#cart-button").addEventListener("click", () => {
  document.querySelector("#cart-empty").textContent = "Your cart is empty. Add something you love!";
  updateCart();
  openDialog("cart", "Your cart");
});

document.querySelector("#address-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (cart.size === 0) return;
  const addressData = new FormData(event.currentTarget);
  const address = [
    addressData.get("name"),
    addressData.get("street"),
    addressData.get("city"),
    addressData.get("region"),
    addressData.get("postal"),
    addressData.get("country"),
  ].join(", ");
  const payment = addressData.get("payment");
  const items = [...cart.values()].map((item) => ({ ...item }));
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  orders.unshift({
    number: String(Date.now()).slice(-8),
    date: new Date().toLocaleDateString(),
    items,
    total,
    address,
    payment,
    coordinates: detectedLocation,
    status: "Placed",
  });
  cart.clear();
  updateCart();
  renderOrders();
  dialogTitle.textContent = "Demo order placed";
  document.querySelector("#cart-empty").textContent = "Thanks! Your demo order is confirmed.";
});

document.querySelector("#orders-button").addEventListener("click", () => {
  renderOrders();
  openDialog("orders", "Your orders");
});

document.querySelector("#dialog-close").addEventListener("click", () => storeDialog.close());
storeDialog.addEventListener("click", (event) => {
  if (event.target === storeDialog) storeDialog.close();
});

document.querySelectorAll(".favorite").forEach((button) => {
  button.addEventListener("click", () => {
    const saved = button.classList.toggle("is-favorite");
    button.textContent = saved ? "♥" : "♡";
    button.setAttribute("aria-pressed", String(saved));
  });
});

function filterProducts() {
  const query = searchInput.value.trim().toLowerCase();
  const category = categorySelect.value;
  let visibleProducts = 0;

  productCards.forEach((card) => {
    const productCategory = card.querySelector(".product-category").textContent.trim();
    const matchesQuery = `${card.dataset.name} ${productCategory}`.toLowerCase().includes(query);
    const matchesCategory = category === "All" || productCategory === category;
    const matches = matchesQuery && matchesCategory;
    card.hidden = !matches;
    if (matches) visibleProducts += 1;
  });

  emptyState.hidden = visibleProducts > 0;
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  filterProducts();
});

categorySelect.addEventListener("change", filterProducts);
