// // FILE: wholesale.js
// if (!window.ScarStore) { window.ScarStore = {}; }

// Object.assign(ScarStore, {
//     Wholesale: {
//         temporaryModelSelections: {},

//         initializeCardSelection(card, product) {
//             const initialSelections = {};
//             product.variants['موديل الهاتف'].forEach(modelOption => {
//                 const modelName = modelOption.value;
//                 const minPurchase = modelOption.minPurchase ?? 0; 
//                 if (minPurchase > 0) {
//                     initialSelections[modelName] = minPurchase;
//                 }
//             });
//             if (Object.keys(initialSelections).length > 0) {
//                 card.dataset.modelSelection = JSON.stringify(initialSelections);
//             }
//         },

//         getSelectedOptions(productContainer) {
//             const product = ScarStore.state.productMap.get(productContainer.dataset.id);
//             const selectedOptions = {};

//             // Handle products WITH models
//             if (product.variants && product.variants['موديل الهاتف']) {
//                 const modelSelectionData = productContainer.dataset.modelSelection;
//                 if (modelSelectionData) {
//                     const selections = JSON.parse(modelSelectionData);
//                     if(Object.keys(selections).length > 0) {
//                        selectedOptions['موديل الهاتف'] = selections;
//                     }
//                 }
//                 if (product.variants['اللون']) {
//                     selectedOptions['اللون'] = 'كل الألوان';
//                 }
//             } else { // Handle products WITHOUT models (e.g., only colors)
//                 const selectedColor = productContainer.querySelector('[name^="option-"][type="radio"]:checked');
//                 if (selectedColor) {
//                     selectedOptions['اللون'] = selectedColor.value;
//                 } else if (product.variants && product.variants['اللون']) {
//                     // Default to first color if none selected
//                     const firstColor = product.variants['اللون'][0];
//                     selectedOptions['اللون'] = typeof firstColor === 'object' ? firstColor.value : firstColor;
//                 }
//             }
//             return selectedOptions;
//         },
  
//         renderCardUI(container, product, cartItem, isPageLayout) {
//             const variantsContainer = container.querySelector('.variants-container');
//             const actionButtonContainer = container.querySelector('.action-button-container');

//             // Case 1: Product has models -> Use the standard controls but modify their actions
//             if (product.variants && product.variants['موديل الهاتف']) {
//                 if (variantsContainer && product.variants['اللون']) {
//                     variantsContainer.innerHTML = ScarStore.Templates.getColorSwatchesHtml(product, 'wholesale', null, !isPageLayout);
//                 }

//                 // Use the standard action controls template
//                 const actionControlsFragment = ScarStore.Templates.getCardActionControlsHtml(product, cartItem);
//                 
//                 const qtyInput = actionControlsFragment.querySelector('.qty-input');
//                 const decreaseBtn = actionControlsFragment.querySelector('[data-action="decrease-qty"]') || actionControlsFragment.querySelector('[data-action="decrease-cart-qty"]');
//                 const increaseBtn = actionControlsFragment.querySelector('[data-action="increase-qty"]') || actionControlsFragment.querySelector('[data-action="increase-cart-qty"]');
//                 
//                 // ✨ FIX: ALWAYS make the controls open the model selector for these products.
//                 if (decreaseBtn) decreaseBtn.dataset.action = 'open-model-selector';
//                 if (increaseBtn) increaseBtn.dataset.action = 'open-model-selector';
//                 
//                 // Display the total selected quantity
//                 const totalQty = JSON.parse(container.dataset.modelSelection || '{}');
//                 const totalQtyCount = Object.values(totalQty).reduce((sum, qty) => sum + Number(qty), 0);
//                 qtyInput.value = totalQtyCount;
//                 qtyInput.readOnly = true;
                
//                 if(cartItem) {
//                     // When in cart, the main button is a remove button
//                     const removeBtn = actionControlsFragment.querySelector('.add-to-cart-btn');
//                     removeBtn.dataset.action = 'remove-from-cart';
//                     removeBtn.dataset.cartId = cartItem.cartId;
//                 }

//                 actionButtonContainer.appendChild(actionControlsFragment);

//             } else { // Case 2: Product does NOT have models (e.g., only colors) -> Use retail-like UI
//                 if (variantsContainer && product.variants) {
//                     const selectedOptions = cartItem ? cartItem.options : ScarStore.StoreLogic.getSelectedOptions(container);
//                     variantsContainer.innerHTML = ScarStore.Templates.getVariantsHtml(product, !isPageLayout, selectedOptions);
//                 }
//                 const actionControls = ScarStore.Templates.getCardActionControlsHtml(product, cartItem);
//                 actionButtonContainer.appendChild(actionControls);
//             }
//         },
//         generateCartItemId(productId, options) {
//             const product = ScarStore.state.productMap.get(productId);
//             // If product has no models, make cart ID unique by color
//             if (product.variants && !product.variants['موديل الهاتف'] && options['اللون']) {
//                 return `${productId}_${options['اللون']}`;
//             }
//             // Otherwise, ID is just the product ID for wholesale items with models
//             return productId;
//         },

//         addToCart(product, quantity, options) {
//             // Check for models only if the product is supposed to have them
//             if (product.variants && product.variants['موديل الهاتف'] && (!options['موديل الهاتف'] || Object.keys(options['موديل الهاتف']).length === 0)) {
//                 ScarStore.Toast.show('يرجى اختيار موديل واحد على الأقل', 'danger');
//                 return;
//             }

//             const finalPrice = ScarStore.StoreLogic.calculateCurrentPrice(product, options);

//             if (product.stock < quantity) {
//                 ScarStore.Toast.show('الكمية المطلوبة غير متوفرة في المخزون', 'danger');
//                 return;
//             }

//             const cartItemId = this.generateCartItemId(product.id, options);
//             let cartItem = ScarStore.state.cart.find(item => item.cartId === cartItemId);
//             
//             if (cartItem) {
//                 cartItem.quantity = quantity;
//                 cartItem.options = options;
//                 cartItem.price = finalPrice; 
//             } else {
//                 ScarStore.state.cart.push({ 
//                     cartId: cartItemId, 
//                     id: product.id, 
//                     quantity: quantity, 
//                     options,
//                     price: finalPrice
//                 });
//             }
//             
//             ScarStore.Cart.save();
//             ScarStore.Cart.updateUI();
//             ScarStore.UI.updateProductCardState(product.id);
//             ScarStore.Toast.show('تم تحديث السلة بنجاح!', 'success');
//         },
//         
//         showModelSelectorModal(productId) {
//             const product = ScarStore.state.productMap.get(productId);
//             if (!product || !product.variants || !product.variants['موديل الهاتف']) return;

//             const productContainer = document.querySelector(`.product-card[data-id="${productId}"], #product-page-content[data-id="${productId}"]`);
//             
//             const existingSelections = productContainer.dataset.modelSelection 
//                                      ? JSON.parse(productContainer.dataset.modelSelection) 
//                                      : {};

//             this.temporaryModelSelections = JSON.parse(JSON.stringify(existingSelections));

//             const template = document.getElementById('model-selector-modal-template');
//             const clone = template.content.cloneNode(true);
//             clone.getElementById('model-selector-title').textContent = `اختر موديلات لـ: ${product.name}`;
//             
//             const colorsContainer = clone.getElementById('model-selector-colors');
//             if (product.variants['اللون']) {
//                 colorsContainer.innerHTML = `<div class="flex items-center gap-2"><span>الألوان المتاحة:</span><div class="flex flex-wrap items-center gap-1.5">${ScarStore.Templates.getColorSwatchesHtml(product, 'wholesale')}</div></div>`;
//             }
//             
//             const listContainer = clone.getElementById('model-selector-list');
//             const itemTemplate = document.getElementById('model-selector-item-template');
//             
//             product.variants['موديل الهاتف'].forEach(modelOption => {
//                 const modelName = modelOption.value;
//                 const minPurchase = modelOption.minPurchase ?? 0;
//                 const purchaseStep = modelOption.purchaseStep ?? 1;

//                 const itemClone = itemTemplate.content.cloneNode(true);
//                 const modelItem = itemClone.querySelector('.model-item');
//                 const qtyInput = itemClone.querySelector('.model-qty-input'); 

//                 modelItem.dataset.modelName = modelName;
//                 modelItem.dataset.minPurchase = minPurchase;
//                 modelItem.dataset.purchaseStep = purchaseStep;
//                 
//                 const { currency } = ScarStore.state.storeData.config;
//                 const modelPrice = product.basePrice + (modelOption.priceModifier || 0);
//                 itemClone.querySelector('.model-name').textContent = modelName;
//                 itemClone.querySelector('.model-price').textContent = `${modelPrice.toFixed(2)} ${currency} للقطعة`;
//                 
//                 let initialQty;
//                 if (this.temporaryModelSelections.hasOwnProperty(modelName)) {
//                     initialQty = this.temporaryModelSelections[modelName];
//                 } else {
//                     initialQty = minPurchase;
//                     this.temporaryModelSelections[modelName] = initialQty;
//                 }

//                 qtyInput.defaultValue = initialQty;
//                 qtyInput.value = initialQty;
//                 qtyInput.setAttribute('value', initialQty);
//                 qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
//                 qtyInput.min = 0;

//                 listContainer.appendChild(itemClone);
//             });

//             const tempDiv = document.createElement('div');
//             tempDiv.appendChild(clone);
//             ScarStore.Modals.show(tempDiv.innerHTML);
//             lucide.createIcons();
//             
//             this.setupModelSelectorEvents(productId);
//             this.updateModelSelectorTotal();
//         },

//         setupModelSelectorEvents(productId) {
//      const modal = document.querySelector('#model-selector-list').closest('.modal-content');

//             modal.addEventListener('click', e => {
//                 const target = e.target;
//                 const item = target.closest('.model-item');

//                 // ⭐ NEW: Handle view mode toggle
//                 const listContainer = document.getElementById('model-selector-list');
//                 const listBtn = document.getElementById('view-mode-list');
//                 const gridBtn = document.getElementById('view-mode-grid');

//                 if(target.closest('#view-mode-list')) {
//                     listContainer.classList.add('is-list-view');
//                     listContainer.classList.remove('is-grid-view');
//                     listBtn.classList.add('bg-indigo-100', 'text-indigo-600');
//                     gridBtn.classList.remove('bg-indigo-100', 'text-indigo-600');
//                     return;
//                 }
//                  if(target.closest('#view-mode-grid')) {
//                     listContainer.classList.remove('is-list-view');
//                     listContainer.classList.add('is-grid-view');
//                     gridBtn.classList.add('bg-indigo-100', 'text-indigo-600');
//                     listBtn.classList.remove('bg-indigo-100', 'text-indigo-600');
//                     return;
//                 }

//                 if (!item) return;

//                 // Handle quantity changes
//                 const modelName = item.dataset.modelName;
//                 const minPurchase = parseInt(item.dataset.minPurchase, 10);
//                 const purchaseStep = parseInt(item.dataset.purchaseStep, 10);
//                 const input = item.querySelector('.model-qty-input');

//                 let currentQty = parseInt(input.value, 10) || 0;
//                 
//                 if (target.closest('[data-action="increase-model-qty"]')) {
//                     currentQty = (currentQty < minPurchase) ? minPurchase : currentQty + purchaseStep;
//                 } else if (target.closest('[data-action="decrease-model-qty"]')) {
//                     let newQty = currentQty - purchaseStep;
//                     if (newQty < minPurchase) {
//                         newQty = 0;
//                     }
//                     currentQty = newQty;
//                 }

//                 input.value = currentQty;
//                 if (currentQty > 0) {
//                     this.temporaryModelSelections[modelName] = currentQty;
//                 } else {
//                     delete this.temporaryModelSelections[modelName];
//                 }
//                 this.updateModelSelectorTotal();
//             });


//             document.getElementById('model-search-input').addEventListener('input', e => {
//                 const searchTerm = e.target.value.toLowerCase();
//                 document.querySelectorAll('#model-selector-list .model-item').forEach(item => {
//                     const modelName = item.dataset.modelName.toLowerCase();
//                     item.style.display = modelName.includes(searchTerm) ? 'flex' : 'none';
//                 });
//             });

//             document.getElementById('confirm-model-selection-btn').addEventListener('click', () => {
//                 const productContainer = document.querySelector(`.product-card[data-id="${productId}"], #product-page-content[data-id="${productId}"]`);
//                 if (productContainer) {
//                     const validSelections = {};
//                     for (const model in this.temporaryModelSelections) {
//                         if (this.temporaryModelSelections[model] > 0) {
//                             validSelections[model] = this.temporaryModelSelections[model];
//                         }
//                     }
//                     productContainer.dataset.modelSelection = JSON.stringify(validSelections);
//                     ScarStore.UI.updateProductCardState(productId);

//                     // Automatically update the cart if the item is already in it
//                     const cartItem = ScarStore.state.cart.find(item => item.id === productId);
//                     if (cartItem) {
//                         const product = ScarStore.state.productMap.get(productId);
//                         const options = ScarStore.Wholesale.getSelectedOptions(productContainer);
//                         const quantity = Object.values(options['موديل الهاتف'] || {}).reduce((sum, qty) => sum + Number(qty), 0);

//                         if (quantity > 0) {
//                              ScarStore.Wholesale.addToCart(product, quantity, options);
//                         } else {
//                              ScarStore.Cart.remove(productId);
//                         }
//                     }
//                 }
//                 ScarStore.Modals.closeLast();
//             });
//         },

//         updateModelSelectorTotal() {
//             const total = Object.values(this.temporaryModelSelections).reduce((sum, qty) => sum + Number(qty), 0);
//             document.getElementById('model-selector-total').textContent = `${total} قطعة`;
//         }
//     }
// });