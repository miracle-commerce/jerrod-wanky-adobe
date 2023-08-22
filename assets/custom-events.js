// Custom events have been added to the theme to make adding
// custom functionality easier. The below events have been
// exposed as well as the associated data for each event.
// To enable this functionality update the 'useCustomEvents' variable in
// the theme.liquid file to 'true'.
// This event fires whenever an item has been added to the cart.
// This event is exposed when the ajax cart is enabled.
// The product object is passed within the detail object.
document.addEventListener("flu:cart:item-added", function (evt) {
  console.log("Item added to the cart", evt.detail.product);
}); // This event fires whenever the cart is updated.
// This event is exposed when the ajax cart is enabled.
// The cart object is passed within the detail object.

document.addEventListener("flu:cart:updated", function (evt) {
  console.log("Cart updated", evt.detail.cart);
}); // This event fires whenever there is an error when adding an item to the cart.
// This error is typically due to a product not having sufficient stock.
// The error message is passed within the detail object.

document.addEventListener("flu:cart:error", function (evt) {
  console.log(evt.detail.errorMessage, "Cart error");
}); // This event fires whenever the quick cart is opened.
// This event is exposed when the ajax cart is enabled.
// The cart object is passed within the detail object.

document.addEventListener("flu:quick-cart:open", function (evt) {
  console.log("Quick cart opened", evt.detail.cart);
}); // This event fires whenever the quick cart is opened.
// This event is exposed when the ajax cart is enabled.

document.addEventListener("flu:quick-cart:close", function () {
  console.log("Quick cart closed");
}); // This event fires whenever a variant product is selected.
// This event is exposed when a 'Variant selectors' block has been added to
// a product template or featured product section
// The selected variant object is passed within the detail object.

document.addEventListener("flu:product:variant-change", function (evt) {
  console.log("Product variant changed", evt.detail.variant);
}); // This event fires whenever a product quanatiy is updated.
// This event is exposed when a 'Quantity selector' block has been added to
// a product template or featured product section
// The quantity and selected variant object is passed within the detail object.

document.addEventListener("flu:product:quantity-update", function (evt) {
  console.log("Product quantity updated", evt.detail.quantity, evt.detail.variant);
}); // This event fires whenever quickview modal is opened.
// This event is exposed when the 'Enable quick shop' feature is enabled
// And a quick view modal is opened.

document.addEventListener("quickview:loaded", function () {
  console.log("Quickview loaded");
});
