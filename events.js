// FILE: events.js

ScarStore.generateOrderId = function() {
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    return `SC-${timestamp}-${randomPart}`;
};

Object.assign(ScarStore, {
    Events: {
        setup() {
            window.addEventListener('popstate', () => ScarStore.Router.handleRouteChange());
            window.addEventListener('keyup', e => { if (e.key === "Escape") ScarStore.Modals.closeLast(); });
            window.addEventListener('awesomplete-selectcomplete', e => ScarStore.Router.navigateTo(`?search=${encodeURIComponent(e.text.value)}`));
            window.addEventListener('scroll', this.handleScroll);
            
            this.resizeTimeout = null;
            window.addEventListener('resize', () => {
                clearTimeout(this.resizeTimeout);
                this.resizeTimeout = setTimeout(() => {
                    if (ScarStore.state.currentView === 'category') {
                        ScarStore.UI.handleFilterBarResponsiveness();
                    }
                }, 150);
            });

            ScarStore.DOMElements.whatsappBtn.addEventListener('click', () => ScarStore.DOMElements.whatsappPopup.classList.toggle('hidden'));
            ScarStore.DOMElements.closeWhatsappPopup.addEventListener('click', () => ScarStore.DOMElements.whatsappPopup.classList.add('hidden'));
            ScarStore.DOMElements.sendWhatsappMessage.addEventListener('click', this.handleSendWhatsapp.bind(this));

            document.body.addEventListener('click', this.handleBodyClick.bind(this));
            document.body.addEventListener('change', this.handleBodyChange.bind(this));
            document.body.addEventListener('submit', this.handleFormSubmit.bind(this));

            let globalSearchTimeout;
            ScarStore.DOMElements.globalSearchInput.addEventListener('input', (e) => {
                clearTimeout(globalSearchTimeout);
                globalSearchTimeout = setTimeout(() => {
                    const searchTerm = e.target.value.trim();
                    ScarStore.Router.navigateTo(searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '/');
                }, 400);
            });

            document.body.addEventListener('input', e => {
                if (e.target.id === 'local-search-input') {
                    clearTimeout(this.localSearchTimeout);
                    this.localSearchTimeout = setTimeout(() => {
                        ScarStore.state.currentSearchTerm = e.target.value.trim();
                        ScarStore.state.currentPage = 1;
                        if (ScarStore.state.currentView === 'list-page') {
                            ScarStore.UI.renderListPage(new URLSearchParams(window.location.search).get('view'));
                        } else {
                            ScarStore.Router.updateURLWithFilters();
                            ScarStore.UI.renderProducts();
                        }
                    }, 300);
                }
            });
        },

        async handleTrackOrder(form) {
            const { config } = ScarStore.state.storeData;
            const orderId = new FormData(form).get('orderId').trim().toUpperCase();
            const submitBtn = form.querySelector('button[type="submit"]');
            const btnText = submitBtn.querySelector('.button-text');
            const spinner = submitBtn.querySelector('.spinner');

            if (!orderId) {
                ScarStore.Toast.show('الرجاء إدخال معرّف الطلب', 'danger');
                return;
            }

            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');
            submitBtn.disabled = true;

            try {
                const requestUrl = `${config.googleSheetWebAppUrl}?action=search&id=${orderId}`;
                const response = await fetch(requestUrl);

                if (!response.ok) {
                    throw new Error(`خطأ من الخادم: ${response.status} ${response.statusText}`);
                }
                
                const result = await response.json();

                if (result.result === 'success' && result.data) {
                    const modalFragment = ScarStore.Templates.getOrderStatusModalHtml(result.data);
                    const tempDiv = document.createElement('div');
                    tempDiv.appendChild(modalFragment);
                    ScarStore.Modals.replaceContent(tempDiv.innerHTML);
                } else {
                    const notFoundModalFragment = ScarStore.Templates.getOrderNotFoundModalHtml(orderId);
                    const tempDiv = document.createElement('div');
                    tempDiv.appendChild(notFoundModalFragment);
                    ScarStore.Modals.replaceContent(tempDiv.innerHTML);
                }
                lucide.createIcons();

            } catch (error) {
                console.error("حدث خطأ أثناء تتبع الطلب:", error);
                
                let errorMessage = 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
                if (error instanceof TypeError) {
                    errorMessage = 'فشل الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.';
                } else if (error instanceof SyntaxError) {
                    errorMessage = 'استجابة غير صالحة من الخادم. يرجى المحاولة لاحقًا.';
                }
                
                ScarStore.Toast.show(errorMessage, 'danger');
                ScarStore.Modals.closeLast();
                
            } finally {
                btnText.classList.remove('hidden');
                spinner.classList.add('hidden');
                submitBtn.disabled = false;
            }
        },

        setupProductCardHover() {
            let recentlyTouched = false;
            const handleHoverStart = (card) => {
                const imageEl = card.querySelector('.product-image');
                if (!imageEl || imageEl.dataset.originalImage) return;
                const productId = card.dataset.id;
                const product = ScarStore.state.productMap.get(productId);
                if (!product || !product.images || product.images.length < 2) return;
                imageEl.dataset.originalImage = imageEl.src;
                imageEl.src = product.images[1];
            };
            const handleHoverEnd = (card) => {
                const imageEl = card.querySelector('.product-image');
                if (imageEl && imageEl.dataset.originalImage) {
                    imageEl.src = imageEl.dataset.originalImage;
                    delete imageEl.dataset.originalImage;
                }
            };
            document.body.addEventListener('mouseenter', (e) => {
                if (recentlyTouched) return;
                const card = e.target.closest('.product-card');
                if (card) handleHoverStart(card);
            }, true);
            document.body.addEventListener('mouseleave', (e) => {
                const card = e.target.closest('.product-card');
                if (card) handleHoverEnd(card);
            }, true);
            document.body.addEventListener('touchstart', (e) => {
                recentlyTouched = true;
                const card = e.target.closest('.product-card');
                if (card) handleHoverStart(card);
            }, { passive: true });
            document.body.addEventListener('touchend', (e) => {
                const target = e.changedTouches[0]?.target;
                if(target) {
                    const card = target.closest('.product-card');
                    if (card) handleHoverEnd(card);
                }
                setTimeout(() => { recentlyTouched = false; }, 500);
            });
            document.body.addEventListener('touchcancel', (e) => {
                const target = e.changedTouches[0]?.target;
                if(target) {
                    const card = target.closest('.product-card');
                    if (card) handleHoverEnd(card);
                }
                setTimeout(() => { recentlyTouched = false; }, 500);
            });
        },
        
        handleScroll() {
            const isScrolled = window.scrollY > 300;
        
            if (ScarStore.DOMElements.backToTopBtn) {
                ScarStore.DOMElements.backToTopBtn.classList.toggle('visible', isScrolled);
            }
        
            if (ScarStore.DOMElements.whatsappWidget) {
                ScarStore.DOMElements.whatsappWidget.classList.toggle('visible', isScrolled);
            }
        },

        handleBodyChange(e) {
            const target = e.target;
            
            if (target.classList.contains('product-variant-selector')) {
                const productContainer = target.closest('[data-id]');
                if (!productContainer) return;

                const productId = productContainer.dataset.id;
                const product = ScarStore.state.productMap.get(productId);
                if (!product) return;
                
                if (target.name.includes('اللون')) {
                    const selectedColorValue = target.value;
                    const colorOption = product.variants['اللون'].find(opt => (typeof opt === 'object' ? opt.value : opt) === selectedColorValue);

                    if (colorOption && colorOption.imageSet) {
                        const imageIndex = colorOption.imageSet - 1;
                        if (product.images[imageIndex]) {
                            const mainImage = productContainer.querySelector('.main-product-img');
                            const thumbnails = productContainer.querySelectorAll('.product-thumbnail-item');
                            
                            if (mainImage) mainImage.src = product.images[imageIndex];
                            
                            if (thumbnails.length > 0) {
                                thumbnails.forEach((thumb, index) => {
                                    const isSelected = index === imageIndex;
                                    thumb.classList.toggle('ring-2', isSelected);
                                    thumb.classList.toggle('ring-indigo-500', isSelected);
                                });
                            }
                        }
                    }
                }

                const cartItemContainer = target.closest('[data-cart-id]');
                if (cartItemContainer) {
                    const cartId = cartItemContainer.dataset.cartId;
                    const variantKey = target.dataset.variantKey;
                    const newVariantValue = target.value;
                    ScarStore.Cart.changeVariant(cartId, productId, variantKey, newVariantValue);
                    return; 
                }

                ScarStore.UI.syncProductCardViews(productId);
                return;
            }

            let filtersChanged = false;
            if (target.id === 'filter-main-category') {
                const newCategory = target.value;
                ScarStore.Router.navigateTo(`?category=${newCategory}`);
                return;
            }
            if (target.id === 'filter-sub-category') {
                const catPath = target.value ? `${ScarStore.state.activeMainCategory}/${target.value}` : ScarStore.state.activeMainCategory;
                ScarStore.Router.navigateTo(`?category=${catPath}`);
                return;
            }
            if (target.id === 'filter-brand') {
                const tomselect = target.tomselect;
                if (tomselect) {
                    ScarStore.state.activeBrands = tomselect.getValue();
                    filtersChanged = true;
                }
            }
            if (target.id === 'sort-options') {
                ScarStore.state.sortBy = target.value;
                filtersChanged = true;
            }
            if (target.name === 'shipping') this.updateCheckoutSummary();

            if (filtersChanged) {
                ScarStore.state.currentPage = 1;
                if (ScarStore.state.currentView === 'list-page') {
                    ScarStore.UI.renderListPage(new URLSearchParams(window.location.search).get('view'));
                } else {
                    ScarStore.Router.updateURLWithFilters();
                    ScarStore.UI.renderProducts();
                }
            }
        },

        handleBodyClick(e) {
            const target = e.target;
            
            const handlePriceModeToggle = () => {
                if (ScarStore.state.priceMode === 'retail') {
                    ScarStore.Modals.showAlert('تنبيه', 'لا يمكن التوجه إلى وضع الجملة في الوقت الحالي، جاري تطويره. انتظرونا!');
                    return;
                }

                if (ScarStore.state.cart.length > 0) {
                    ScarStore.Modals.showConfirmation('تغيير وضع الأسعار', 'سيتم إفراغ سلة التسوق الخاصة بك عند التبديل. هل أنت متأكد؟',
                        () => {
                            ScarStore.Cart.clear();
                            ScarStore.state.priceMode = 'wholesale';
                            ScarStore.UI.updatePriceModeToggle();
                            ScarStore.resetAndReloadApp();
                        }
                    );
                } else {
                    ScarStore.state.priceMode = 'wholesale';
                    ScarStore.UI.updatePriceModeToggle();
                    ScarStore.resetAndReloadApp();
                }
            };

            const delegates = {
                '#more-filters-toggle-btn': (btn) => { bootstrap.Dropdown.getOrCreateInstance(btn).toggle(); },
                'a[href^="?"]': (el) => { e.preventDefault(); ScarStore.Router.navigateTo(el.getAttribute('href')); },
                'a[href="/"]': (el) => { e.preventDefault(); ScarStore.Router.navigateTo('/'); },
                '.close-modal-btn': () => ScarStore.Modals.closeLast(),
                '[data-action="close-modal"]': () => ScarStore.Modals.closeLast(),
                '#track-order-btn': () => ScarStore.Modals.showOrderTracking(),
                '#price-mode-toggle': handlePriceModeToggle,
                '#toggle-categories-view-btn': () => {
                    ScarStore.state.isAllCategoriesView = !ScarStore.state.isAllCategoriesView;
                    ScarStore.UI.renderHomeCategories();
                },
                '#complaints-btn': (el) => { 
                    e.preventDefault();
                    ScarStore.Modals.show(ScarStore.Templates.getComplaintModalHtml());
                    ScarStore.Modals.initIntlTelInput('#complaint-phone');
                    lucide.createIcons();
                    const { phone } = ScarStore.state.userInfo;
                    const iti = ScarStore.state.phoneInputInstances['complaint-phone'];
                    if (iti && phone) {
                        iti.setNumber(phone);
                    }
                },
                '.past-order-item': (el) => {
                    const orderId = el.dataset.orderId;
                    const input = el.closest('form').querySelector('#order-id-input');
                    if (orderId && input) {
                        input.value = orderId;
                        input.focus();
                        el.closest('#past-orders-list').querySelectorAll('.past-order-item').forEach(item => item.classList.remove('bg-indigo-100'));
                        el.classList.add('bg-indigo-100');
                    }
                },
                '[data-action="add-to-cart"]': el => this.handleAddToCartClick(el),
                '[data-action="remove-from-cart"]': el => {
                    const cartId = el.dataset.cartId || el.closest('[data-cart-id]')?.dataset.cartId;
                    if(cartId) ScarStore.Cart.remove(cartId);
                },
                '[data-action="decrease-qty"]': el => this.updateTempQty(el, -1),
                '[data-action="increase-qty"]': el => this.updateTempQty(el, 1),
                '[data-action="decrease-cart-qty"]': (el, ev) => { ev.stopPropagation(); ScarStore.Cart.updateQuantity(el.closest('[data-cart-id]').dataset.cartId, -1); },
                '[data-action="increase-cart-qty"]': (el, ev) => { ev.stopPropagation(); ScarStore.Cart.updateQuantity(el.closest('[data-cart-id]').dataset.cartId, 1); },
                '#clear-cart-btn': (el, ev) => { ev.stopPropagation(); ScarStore.Cart.clear(); },
                '#clear-wishlist-btn': (el, ev) => { ev.stopPropagation(); ScarStore.Wishlist.clear(); },
                '#checkout-btn': () => ScarStore.Modals.handleCheckout(),
                '#copy-summary-btn': () => this.handleCopySummary(),
                '#show-cart-products-btn, #show-wishlist-products-btn': (el) => {
                    e.preventDefault();
                    ScarStore.Dropdowns.closeAll();
                    ScarStore.Modals.closeLast();
                    ScarStore.Router.navigateTo(el.getAttribute('href'));
                },
                '.modal-overlay': el => { if (e.target === el && el.dataset.closeable === "true") ScarStore.Modals.close(el.querySelector('.modal-content')); },
                '.love-btn': el => { e.stopPropagation(); ScarStore.Wishlist.toggle(el.dataset.id); },
                '.remove-from-wishlist-btn': (el, ev) => {
                    ev.stopPropagation();
                    const productId = el.dataset.id;
                    if (!productId) return;
                
                    const itemElement = el.closest('.flex.items-center.gap-4');
                
                    ScarStore.Wishlist.toggle(productId);
                
                    if (itemElement) {
                        gsap.to(itemElement, {
                            duration: 0.3,
                            opacity: 0,
                            height: 0,
                            paddingTop: 0,
                            paddingBottom: 0,
                            marginTop: 0,
                            marginBottom: 0,
                            ease: 'power2.in',
                            onComplete: () => {
                                itemElement.remove();
                                const wishlistContainer = document.querySelector('#wishlist-dropdown .flex-grow, .mobile-modal-body');
                                if (wishlistContainer && wishlistContainer.children.length === 0) {
                                     ScarStore.Wishlist.updateUI();
                                }
                            }
                        });
                    }
                },
                '.pagination-btn': el => {
                    if (el.disabled) return;
                    ScarStore.state.currentPage = Number(el.dataset.page);
                    ScarStore.Router.updateURLWithFilters();
                    ScarStore.UI.renderProducts();
                    window.scrollTo(0, document.getElementById('category-content').offsetTop - 100);
                },
                '#cart-button': (el) => ScarStore.Dropdowns.toggle('cart', el),
                '#wishlist-button': (el) => ScarStore.Dropdowns.toggle('wishlist', el),
                '#mobile-cart-button': () => ScarStore.Modals.showMobilePage('cart'),
                '#mobile-wishlist-button': () => ScarStore.Modals.showMobilePage('wishlist'),
                '.product-thumbnail-item': el => {
                    const mainImg = el.closest('.space-y-4').querySelector('.main-product-img');
                    const thumbnailImg = el.querySelector('img');
                    if (mainImg && thumbnailImg) {
                        mainImg.src = thumbnailImg.src;
                        el.closest('.grid').querySelectorAll('.product-thumbnail-item').forEach(p => p.classList.remove('ring-2', 'ring-indigo-500'));
                        el.classList.add('ring-2', 'ring-indigo-500');
                    }
                },
                '[data-action="open-lightbox"]': el => ScarStore.Modals.showLightbox({type: 'image', src: el.src}),
                '#lightbox-close': () => ScarStore.Modals.closeLightbox(),
                '#back-to-top-btn': () => window.scrollTo({ top: 0, behavior: 'smooth' }),
                '#back-btn': () => this.handleBackClick(),
                '#share-product-btn': el => this.handleShareClick(el),
                '[data-action="open-model-selector"]': el => {
                    const productContainer = el.closest('[data-id]');
                    if (!productContainer) return;
                    const productId = productContainer.dataset.id;
                    const cartItemForProduct = ScarStore.state.cart.find(item => item.id === productId);
                    if (cartItemForProduct && cartItemForProduct.options && cartItemForProduct.options['موديل الهاتف']) {
                        productContainer.dataset.modelSelection = JSON.stringify(cartItemForProduct.options['موديل الهاتف']);
                    }
                    ScarStore.Wholesale.showModelSelectorModal(productId);
                },
                '#view-mode-grid': () => ScarStore.UI.setProductViewMode('grid'),
                '#view-mode-list': () => ScarStore.UI.setProductViewMode('list'),
                '#price-filter-btn': () => document.getElementById('price-filter-dropdown').classList.toggle('hidden'),
            };

            for (const selector in delegates) {
                const element = target.closest(selector);
                if (element && delegates[selector]) {
                    delegates[selector](element, e);
                    return;
                }
            }
            
            if (!target.closest('#cart-button') && !target.closest('#cart-dropdown')) ScarStore.Dropdowns.close(ScarStore.DOMElements.cartDropdownContainer.querySelector('.header-dropdown'));
            if (!target.closest('#wishlist-button') && !target.closest('#wishlist-dropdown')) ScarStore.Dropdowns.close(ScarStore.DOMElements.wishlistDropdownContainer.querySelector('.header-dropdown'));
            if (!target.closest('#whatsapp-widget')) ScarStore.DOMElements.whatsappPopup.classList.add('hidden');
            if (target.id === 'lightbox-overlay' || target.id === 'lightbox-content') ScarStore.Modals.closeLightbox();
            if (!target.closest('[data-filter="price"]')) document.getElementById('price-filter-dropdown')?.classList.add('hidden');
        },
        
        handleAddToCartClick(btn) {
            const productContainer = btn.closest('[data-id]');
            if (!productContainer) return;
            const productId = productContainer.dataset.id;
            const product = ScarStore.state.productMap.get(productId);
            if (!product) return;
            
            const selectedOptions = ScarStore.StoreLogic.getSelectedOptions(productContainer);

            if (product.variants && product.variants['اللون'] && !selectedOptions['اللون']) {
                ScarStore.Toast.show('الرجاء تحديد اللون أولاً', 'danger');
                return;
            }

            let quantity;
            if (ScarStore.state.priceMode === 'wholesale' && product.variants && product.variants['موديل الهاتف']) {
                quantity = Object.values(selectedOptions['موديل الهاتف'] || {}).reduce((sum, qty) => sum + Number(qty), 0);
                
                if (product.minPurchase && quantity < product.minPurchase) {
                    ScarStore.Toast.show(`الحد الأدنى لإجمالي القطع لهذا المنتج هو ${product.minPurchase} قطعة.`, 'danger');
                    return;
                }
            } else {
                const qtyInput = productContainer.querySelector('.qty-input');
                quantity = qtyInput ? parseInt(qtyInput.value, 10) : (product.minPurchase || 1);
            }

            if (isNaN(quantity) || quantity < 1) {
                if (!(ScarStore.state.priceMode === 'wholesale' && product.variants && product.variants['موديل الهاتف'])) {
                    ScarStore.Toast.show('يرجى اختيار كمية', 'danger');
                }
                return;
            }
            
            ScarStore.Cart.add(productId, quantity, selectedOptions);
        },
        
        updateTempQty(btn, change) {
            const qtyContainer = btn.closest('.flex');
            if (!qtyContainer) return;
            const input = qtyContainer.querySelector('.qty-input');
            if (!input) return;
            const product = ScarStore.state.productMap.get(input.closest('[data-id]').dataset.id);
            if (!product) return;
            
            const minQty = product.minPurchase || 1;
            const step = product.purchaseStep || 1;
            let currentValue = parseInt(input.value, 10);
            let newValue = currentValue + (change * step);

            if (change < 0 && newValue < minQty) {
                newValue = minQty;
            }
            if (newValue > product.stock) {
                newValue = product.stock;
            }
            
            input.value = newValue;
        },
        
        handleSendWhatsapp() {
            const { config } = ScarStore.state.storeData;
            const message = document.getElementById('whatsapp-message').value;
            if (!config.whatsappNumber || !message) return;
            window.open(`https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
        },
        
        handleFormSubmit(e) {
            const formId = e.target.id;

            if (formId === 'checkout-form') {
                e.preventDefault();
                this.handleOrderSubmit(e.target);
            }
            if (formId === 'order-tracking-form') {
                e.preventDefault();
                this.handleTrackOrder(e.target);
            }
            if (formId === 'complaint-form') {
                e.preventDefault();
                this.handleComplaintSubmit(e.target);
            }
            if (formId === 'phone-form') {
                e.preventDefault();
                const phoneInput = e.target.querySelector('#user-phone-input');
                const iti = ScarStore.state.phoneInputInstances[phoneInput.id];
                const errorEl = e.target.querySelector('#phone-error');
                if (iti && iti.isValidNumber()) {
                    errorEl.textContent = '';
                    ScarStore.state.userInfo.phone = iti.getNumber();
                    ScarStore.Modals.saveUserInfo();
                    ScarStore.Modals.closeLast();
                    ScarStore.Toast.show('تم حفظ رقم الهاتف بنجاح!', 'success');
                } else {
                    errorEl.textContent = 'الرجاء إدخال رقم هاتف صحيح.';
                }
            }
            if (formId === 'name-form') {
                e.preventDefault();
                ScarStore.state.userInfo.name = e.target.querySelector('#user-name-input').value;
                ScarStore.Modals.saveUserInfo();
                ScarStore.Modals.closeLast();
                ScarStore.Toast.show(`أهلاً بك، ${ScarStore.state.userInfo.name}!`, 'success');
            }
        },

        async handleOrderSubmit(form) {
            const { cart, productMap, storeData: { config } } = ScarStore.state;
            const googleSheetUrl = config.googleSheetWebAppUrl;
            if (!googleSheetUrl || googleSheetUrl.includes("YOUR_GOOGLE_SHEET") || cart.length === 0) {
                ScarStore.Toast.show('عفواً، خدمة الطلبات غير متاحة حالياً', 'danger');
                return;
            }

            const phoneInput = form.querySelector('#customer-phone');
            const iti = ScarStore.state.phoneInputInstances[phoneInput.id];
            if (!iti || !iti.isValidNumber()) {
                ScarStore.Toast.show('يرجى إدخال رقم هاتف صحيح', 'danger');
                return;
            }
            const fullPhoneNumber = iti.getNumber();

            const submitBtn = form.closest('.modal-content').querySelector('button[type="submit"]');
            const btnText = submitBtn.querySelector('.button-text');
            const spinner = submitBtn.querySelector('.spinner');
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');
            submitBtn.disabled = true;

            const orderId = ScarStore.generateOrderId();
            const formData = new FormData(form);
            formData.set('phone', fullPhoneNumber);
            
            const shippingOption = document.querySelector('input[name="shipping"]:checked');
            const shippingCost = parseFloat(shippingOption.dataset.cost);
            const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            const totalPrice = subtotal + shippingCost;
            formData.append('orderId', orderId);

            const cartDetails = cart.map(item => {
                const product = productMap.get(item.id);
                let optionsStr = '';
                if (item.options) {
                    let modelStr = '';
                    if (item.options['موديل الهاتف']) {
                        if (typeof item.options['موديل الهاتف'] === 'object') {
                            modelStr = Object.entries(item.options['موديل الهاتف']).map(([model, qty]) => `${model}: ${qty} قطعة`).join(' | ');
                        } else {
                            modelStr = `الموديل: ${item.options['موديل الهاتف']}`;
                        }
                    }
                    const otherOptionsStr = Object.entries(item.options).filter(([k]) => k !== 'موديل الهاتف').map(([k, v]) => `${k}: ${v}`).join(' - ');
                    optionsStr = [modelStr, otherOptionsStr].filter(Boolean).join(' - ');
                }
                return `${product.id} - ${product.name} (الكمية الإجمالية: ${item.quantity}) (السعر: ${item.price}) [${optionsStr}]`;
            }).join(', ');

            formData.append('shippingCost', shippingCost);
            formData.append('totalPrice', totalPrice);
            formData.append('cartData', cartDetails);
            formData.append('timestamp', new Date().toLocaleString('ar-EG'));

            try {
                const response = await fetch(googleSheetUrl, { method: 'POST', body: formData });
                const result = await response.json();
                if (result.result === "success") {

                    const newName = formData.get('name');
                    const newPhone = fullPhoneNumber; 
                    const newGovernorate = formData.get('governorate');
                    const newAddress = formData.get('address');

                    if (newName !== ScarStore.state.userInfo.name || newPhone !== ScarStore.state.userInfo.phone || newGovernorate !== ScarStore.state.userInfo.governorate || newAddress !== ScarStore.state.userInfo.address) {
                        ScarStore.state.userInfo.name = newName;
                        ScarStore.state.userInfo.phone = newPhone;
                        ScarStore.state.userInfo.governorate = newGovernorate;
                        ScarStore.state.userInfo.address = newAddress;
                        ScarStore.Modals.saveUserInfo();
                        ScarStore.Toast.show('تم تحديث بياناتك المحفوظة', 'info');
                    }

                    ScarStore.Cart.clear();
                    ScarStore.Modals.replaceContent(ScarStore.Templates.getOrderSuccessModalHtml(orderId));
                    
                    const storageVersion = ScarStore.state.storeData.config.storageVersion || 'v-fallback';
                    const pastOrders = JSON.parse(localStorage.getItem(`scarOrders_${storageVersion}`) || '[]');
                    pastOrders.push({ id: orderId, date: new Date().toISOString() });
                    localStorage.setItem(`scarOrders_${storageVersion}`, JSON.stringify(pastOrders));

                } else {
                    throw new Error(result.message || 'فشل إرسال الطلب');
                }
            } catch (error) {
                console.error('Error submitting order:', error);
                ScarStore.Toast.show('حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.', 'danger');
            } finally {
                btnText.classList.remove('hidden');
                spinner.classList.add('hidden');
                submitBtn.disabled = false;
            }
        },
        
        async handleComplaintSubmit(form) {
            const { config } = ScarStore.state.storeData;
            const complaintUrl = config.googleSheetcomplaintUrl;

            if (!complaintUrl || complaintUrl.includes("YOUR_COMPLAINT_URL")) {
                ScarStore.Toast.show('عفواً، خدمة الشكاوى غير متاحة حالياً', 'danger');
                return;
            }

            const phoneInput = form.querySelector('#complaint-phone');
            const iti = ScarStore.state.phoneInputInstances[phoneInput.id];
            if (!iti || !iti.isValidNumber()) {
                ScarStore.Toast.show('يرجى إدخال رقم هاتف صحيح', 'danger');
                return;
            }
            const fullPhoneNumber = iti.getNumber();

            const submitBtn = form.querySelector('button[type="submit"]');
            const btnText = submitBtn.querySelector('.button-text');
            const spinner = submitBtn.querySelector('.spinner');
            
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');
            submitBtn.disabled = true;

            const formData = new FormData(form);
            formData.set('phone', fullPhoneNumber);
            formData.append('timestamp', new Date().toLocaleString('ar-EG'));

            try {
                const response = await fetch(complaintUrl, { method: 'POST', body: formData });
                const result = await response.json();
                if (result.result === "success") {
                    ScarStore.Modals.closeLast();
                    ScarStore.Toast.show('تم إرسال رسالتك بنجاح. شكراً لك!', 'success');
                } else {
                    throw new Error(result.message || 'فشل إرسال الشكوى');
                }
            } catch (error) {
                console.error('Error submitting complaint:', error);
                ScarStore.Toast.show('حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.', 'danger');
            } finally {
                btnText.classList.remove('hidden');
                spinner.classList.add('hidden');
                submitBtn.disabled = false;
            }
        },
        
        handleBrandSearch(e) {
            const searchTerm = e.target.value.toLowerCase();
            const brandItems = document.querySelectorAll('#filter-brand-container .brand-item');
            brandItems.forEach(item => {
                const brandName = item.querySelector('.brand-name').textContent.toLowerCase();
                item.classList.toggle('hidden', !brandName.includes(searchTerm));
            });
        },
        
        handleCopySummary() {
            const summaryPanel = document.getElementById('summary-panel');
            if (!summaryPanel || !window.html2canvas) {
                ScarStore.Toast.show('حدث خطأ أثناء نسخ الملخص', 'danger');
                return;
            }
            
            html2canvas(summaryPanel, {
                backgroundColor: '#f1f5f9',
                useCORS: true 
            }).then(canvas => {
                canvas.toBlob(blob => {
                    navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]).then(() => {
                        ScarStore.Toast.show('تم نسخ ملخص الطلب كصورة!', 'success');
                    }).catch(err => {
                        console.error('Failed to copy image: ', err);
                        ScarStore.Toast.show('فشل نسخ الصورة. قد لا يدعم متصفحك هذه الميزة.', 'danger');
                    });
                });
            });
        },
        
        updateCheckoutSummary() {
            const { cart, storeData: { config } } = ScarStore.state;
            const { currency } = config;
            const subtotalEl = document.getElementById('summary-subtotal');
            const shippingEl = document.getElementById('summary-shipping');
            const totalEl = document.getElementById('summary-total');
            if (!subtotalEl || !shippingEl || !totalEl) return;
            const shippingOption = document.querySelector('input[name="shipping"]:checked');
            const shippingCost = shippingOption ? parseFloat(shippingOption.dataset.cost) : 0;
            const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            const grandTotal = subtotal + shippingCost;
            subtotalEl.textContent = `${subtotal.toFixed(2)} ${currency}`;
            shippingEl.textContent = `${shippingCost.toFixed(2)} ${currency}`;
            totalEl.textContent = `${grandTotal.toFixed(2)} ${currency}`;
        },
        
        handleBackClick() {
            const previousPage = sessionStorage.getItem('scarPreviousPage');
            if (previousPage && previousPage !== window.location.href) {
                window.location.href = previousPage;
            } else {
                ScarStore.Router.navigateTo('/');
            }
        },
        
        async handleShareClick(btn) {
            const productId = btn.dataset.id;
            const productName = btn.dataset.name;
            const url = `${window.location.origin}${window.location.pathname}?product=${productId}`;
            
            const shareData = {
                title: `اكتشف ${productName} في متجر SCAR`,
                text: `لقد وجدت هذا المنتج الرائع في متجر SCAR، ألق نظرة!`,
                url: url,
            };

            try {
                if (navigator.share) {
                    await navigator.share(shareData);
                } else {
                    await navigator.clipboard.writeText(url);
                    ScarStore.Toast.show('تم نسخ رابط المنتج!', 'info');
                }
            } catch (err) {
                console.error("Share failed:", err);
                ScarStore.Toast.show('فشلت المشاركة', 'danger');
            }
        },
    }
});