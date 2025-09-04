// FILE: events.js

ScarStore.generateUniqueOrderId = async function() {
    const { config } = ScarStore.state.storeData;
    let orderId;
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        const timestamp = Date.now().toString().slice(-4);
        orderId = `SC-${timestamp}-${randomPart}`;
        try {
            const checkUrl = `${config.googleSheetWebAppUrl}?action=checkId&id=${orderId}&cacheBust=${new Date().getTime()}`;
            const response = await fetch(checkUrl);
            if (!response.ok) throw new Error("Network response was not ok");
            const result = await response.json();
            if (!result.exists) {
                isUnique = true;
            }
        } catch (error) {
            console.error("Error checking ID uniqueness, assuming it's unique to proceed:", error);
            isUnique = true; 
        }
        attempts++;
    }
    return orderId;
};

Object.assign(ScarStore, {
    Events: {
        setup() {
            window.addEventListener('popstate', () => ScarStore.Router.handleRouteChange());
            window.addEventListener('keyup', e => { if (e.key === "Escape") ScarStore.Modals.closeLast(); });
            window.addEventListener('awesomplete-selectcomplete', e => ScarStore.Router.navigateTo(`?search=${encodeURIComponent(e.text.value)}`));

            window.addEventListener('scroll', this.handleSmartScroll.bind(this));
            
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

        handleSmartScroll() {
            const currentScrollY = window.scrollY;
            const header = document.getElementById('main-header');
            const filterBar = document.getElementById('filter-bar');
            
            const isScrolled = currentScrollY > 300;
            if (ScarStore.DOMElements.backToTopBtn) ScarStore.DOMElements.backToTopBtn.classList.toggle('visible', isScrolled);
            if (ScarStore.DOMElements.whatsappWidget) ScarStore.DOMElements.whatsappWidget.classList.toggle('visible', isScrolled);

            if (currentScrollY < 100) {
                if (header) header.classList.remove('is-hidden');
                if (filterBar) filterBar.classList.remove('is-hidden');
                this.lastScrollY = currentScrollY <= 0 ? 0 : currentScrollY;
                return;
            }
            
            if (currentScrollY > this.lastScrollY) {
                if (header) header.classList.add('is-hidden');
                if (filterBar) filterBar.classList.add('is-hidden');
            }
            else {
                if (header) header.classList.remove('is-hidden');
                if (filterBar) filterBar.classList.remove('is-hidden');
            }

            this.lastScrollY = currentScrollY <= 0 ? 0 : currentScrollY;
        },

  // استبدل الدالة القديمة في ملف events.js بهذه النسخة الكاملة والنهائية
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

    // تفعيل حالة التحميل
    btnText.classList.add('hidden');
    spinner.classList.remove('hidden');
    submitBtn.disabled = true;

    try {
        const requestUrl = `${config.googleSheetWebAppUrl}?action=search&id=${orderId}&cacheBust=${new Date().getTime()}`;
        const response = await fetch(requestUrl);

        if (!response.ok) {
            throw new Error(`خطأ من الخادم: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();

        if (result.result === 'success' && result.data) {
            // --- بداية منطق التحقق التلقائي ---
            const userPhone = ScarStore.state.userInfo.phone;
            const orderPhone = result.data.phone;
            let isAutoVerified = false;

            // مقارنة رقم المستخدم المحفوظ مع رقم هاتف الطلب
            if (userPhone && orderPhone) {
                // دالة صغيرة لإزالة أي رموز غير رقمية للمقارنة بشكل دقيق
                const normalize = (phone) => String(phone).replace(/\D/g, '');
                const normalizedUserPhone = normalize(userPhone);
                const normalizedOrderPhone = normalize(orderPhone);
                
                // التحقق إذا كان أحد الرقمين ينتهي بالآخر (لمعالجة الحالات مع أو بدون كود الدولة)
                if (normalizedUserPhone.endsWith(normalizedOrderPhone) || normalizedOrderPhone.endsWith(normalizedUserPhone)) {
                    isAutoVerified = true;
                }
            }

            // تحديث حالة التحقق العامة قبل عرض النافذة
            ScarStore.state.orderVerification = {
                orderId: result.data.id,
                isVerified: isAutoVerified
            };
            // --- نهاية منطق التحقق التلقائي ---

            // تخزين بيانات الطلب مؤقتاً لاستخدامها في التحقق اليدوي إذا لزم الأمر
            ScarStore.state.currentTrackingData = result.data;
            
            // عرض النافذة (ستظهر بالحالة المناسبة تلقائياً)
            const modalFragment = ScarStore.Templates.getOrderStatusModalHtml(result.data);
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(modalFragment);
            ScarStore.Modals.replaceContent(tempDiv.innerHTML);

        } else {
            // التعامل مع حالة عدم العثور على الطلب
            const notFoundModalFragment = ScarStore.Templates.getOrderNotFoundModalHtml(orderId);
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(notFoundModalFragment);
            ScarStore.Modals.replaceContent(tempDiv.innerHTML);
        }
        
        lucide.createIcons();

    } catch (error) {
        console.error("حدث خطأ أثناء تتبع الطلب:", error);
        
        let errorMessage = 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
        if (error.name === 'TypeError') { // طريقة أفضل للتحقق من أخطاء الشبكة
            errorMessage = 'فشل الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.';
        }
        
        ScarStore.Toast.show(errorMessage, 'danger');
        ScarStore.Modals.closeLast();
        
    } finally {
        // إعادة الزر لحالته الطبيعية دائماً
        btnText.classList.remove('hidden');
        spinner.classList.add('hidden');
        submitBtn.disabled = false;
    }
},

// 2. دالة التحقق اليدوي (مع تحديث الواجهة بسلاسة)
async handleOrderVerification(form) {
    const formData = new FormData(form);
    const enteredPhone = formData.get('phone_verify');
    const { currentTrackingData } = ScarStore.state;

    if (!enteredPhone || !currentTrackingData || !currentTrackingData.phone) return;

    // المقارنة باستخدام آخر 6 أرقام
    const last6Entered = enteredPhone.slice(-6);
    const last6Stored = String(currentTrackingData.phone).slice(-6);

    if (last6Entered === last6Stored) {
        ScarStore.state.orderVerification.isVerified = true;

        // --- تحديث الواجهة بسلاسة بدون إعادة تحميل ---
        const verificationGate = document.getElementById('verification-gate');
        if (verificationGate) {
            // إخفاء وإزالة نموذج التحقق بحركة ناعمة
            gsap.to(verificationGate, {
                height: 0, opacity: 0, padding: 0, margin: 0, duration: 0.4, ease: 'power2.in',
                onComplete: () => verificationGate.remove()
            });
        }

        // كشف البيانات المخفية بحركة ناعمة
        document.querySelectorAll('.masked-data').forEach(el => {
            const unmaskedValue = el.dataset.unmasked;
            gsap.to(el, {
                opacity: 0, duration: 0.2, onComplete: () => {
                    el.innerHTML = unmaskedValue;
                    gsap.to(el, { opacity: 1, duration: 0.2 });
                }
            });
        });

    } else {
        ScarStore.Toast.show('رقم الهاتف غير مطابق لسجلاتنا', 'danger');
        form.classList.add('shake-animation');
        setTimeout(() => form.classList.remove('shake-animation'), 500);
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
        
        handleBodyChange(e) {
            const target = e.target;

            // ✨ جديد: التعامل مع تغيير المحافظة
            if (target.id === 'customer-governorate') {
                this.handleGovernorateChange(target);
                return;
            }

            if (target.classList.contains('qty-input')) {
                const productContainer = target.closest('[data-id]');
                if (productContainer) {
                    const productId = productContainer.dataset.id;
                    const product = ScarStore.state.productMap.get(productId);
                    if (product) {
                        const minQty = product.minPurchase || 1;
                        const stock = product.stock;
                        let currentValue = parseInt(target.value, 10);

                        if (isNaN(currentValue) || currentValue < 1) {
                            currentValue = minQty;
                        }
                        
                        if (currentValue < minQty) {
                            currentValue = minQty;
                            ScarStore.Toast.show(`الحد الأدنى للكمية هو ${minQty} قطعة`, 'info');
                        }

                        if (currentValue > stock) {
                            currentValue = stock;
                            ScarStore.Toast.show(`الكمية المتاحة في المخزن هي ${stock} قطعة فقط`, 'info');
                        }

                        target.value = currentValue;
                    }
                }
                return; 
            }
            
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
                        if (product.images && product.images[imageIndex]) {
                            const mainImage = productContainer.querySelector('.main-product-img');
                            if(mainImage) mainImage.src = product.images[imageIndex];
                        } else if(product.media && product.media[imageIndex]) {
                             const mainImage = productContainer.querySelector('.main-product-img');
                            if(mainImage) mainImage.src = product.media[imageIndex].src;
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

                ScarStore.UI.updateProductCardState(productContainer);
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
            };

            const delegates = {
                '#more-filters-toggle-btn': (btn) => { bootstrap.Dropdown.getOrCreateInstance(btn).toggle(); },
                'a[href^="?"]': (el) => { e.preventDefault(); ScarStore.Router.navigateTo(el.getAttribute('href')); },
                'a[href="/"]': (el) => { e.preventDefault(); ScarStore.Router.navigateTo('/'); },
                '.close-modal-btn': () => ScarStore.Modals.closeLast(),
                '[data-action="close-modal"]': () => ScarStore.Modals.closeLast(),
                '#track-order-btn': () => ScarStore.Modals.showOrderTracking(),
                    '#get-location-map-btn': (el) => this.handleGetLocation(el),

                '#price-mode-toggle': handlePriceModeToggle,
                '#toggle-categories-view-btn': () => {
                    ScarStore.state.isAllCategoriesView = !ScarStore.state.isAllCategoriesView;
                    ScarStore.UI.renderHomeCategories();
                },
                '#feedback-btn': () => ScarStore.Modals.showComplaintModal(),
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
                '#price-filter-btn': (el) => {
                    const dropdown = el.nextElementSibling;
                    if (dropdown) {
                        dropdown.classList.toggle('hidden');
                    }
                },
                // ✨ جديد: إضافة زر تحديد الموقع
                '#get-location-btn': (el) => this.handleGetLocation(el),
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
                if (formId === 'order-verify-form') this.handleOrderVerification(e.target); // <-- تأكد من وجود هذا السطر

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

     // دالة handleOrderSubmit الكاملة من ملف events.js

      async handleOrderSubmit(form) {
    const { cart, productMap, storeData: { config } } = ScarStore.state;
    const googleSheetUrl = config.googleSheetWebAppUrl;

    // تحقق أولي
    if (!googleSheetUrl || cart.length === 0) {
        ScarStore.Toast.show('عفواً، خدمة الطلبات غير متاحة حالياً أو السلة فارغة', 'danger');
        return;
    }

    // تحقق من رقم الهاتف الأساسي
    const phoneInput = form.querySelector('#customer-phone');
    const iti = ScarStore.state.phoneInputInstances[phoneInput.id];
    if (!iti || !iti.isValidNumber()) {
        ScarStore.Toast.show('يرجى إدخال رقم هاتف أساسي صحيح', 'danger');
        return;
    }

    // تحقق من الدفع
    if (!ScarStore.Payment.validate()) {
        ScarStore.Toast.show('يرجى اختيار طريقة الدفع أولاً', 'danger');
        return;
    }

    const selectedPaymentMethod = ScarStore.Payment.getSelectedMethod();

    // زر التأكيد
    const submitBtn = document.getElementById('confirm-order-btn');
    const btnText = submitBtn.querySelector('.button-text');
    const spinner = submitBtn.querySelector('.spinner');
    btnText.classList.add('hidden');
    spinner.classList.remove('hidden');
    submitBtn.disabled = true;

    try {
        // رقم الطلب
        const orderId = await ScarStore.generateUniqueOrderId();

        // بناء البيانات
        const formData = new FormData(form);
        formData.set('phone', iti.getNumber()); // رقم الهاتف بصيغة دولية
        const shippingOption = document.querySelector('input[name="shipping"]:checked');
        const shippingCost = shippingOption ? parseFloat(shippingOption.dataset.cost) || 0 : 0;

        const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const totalPrice = subtotal + shippingCost;

        // تفاصيل السلة
        const cartDetails = cart.map(item => {
            const product = productMap.get(item.id);
            let optionsStr = Object.entries(item.options || {}).map(([key, value]) => {
                if (key === 'موديل الهاتف' && typeof value === 'object') {
                    return `الموديلات: ${Object.entries(value).map(([model, qty]) => `${model} (x${qty})`).join(', ')}`;
                }
                return `${key}: ${value}`;
            }).join(' - ');
            return `${product.id} - ${product.name} (الكمية: ${item.quantity}) (السعر: ${item.price.toFixed(2)}) [${optionsStr}]`;
        }).join(';\n');

        // إضافة البيانات الأساسية
        formData.append('orderId', orderId);
        formData.append('totalPrice', totalPrice.toFixed(2));
        formData.append('cartData', cartDetails);
        formData.append('paymentMethod', selectedPaymentMethod.name);
        formData.append('shippingCost', shippingCost.toFixed(2));
        formData.append('timestamp', new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' }));

        // للتأكد أثناء التطوير
        console.log("📦 بيانات الطلب المرسلة:", Object.fromEntries(formData.entries()));

        // الإرسال إلى Google Sheets
        const response = await fetch(googleSheetUrl, { method: 'POST', body: formData });
        const result = await response.json();

        if (result.result === "success") {
            // حفظ بيانات العميل
            ScarStore.state.userInfo = {
                name: formData.get('name') || "",
                phone: iti.getNumber(),
                phone_secondary: formData.get('phone_secondary') || "",
                governorate: formData.get('governorate') || "",
                district: formData.get('district') || "",
                address: formData.get('address') || "",
                notes: formData.get('notes') || ""
            };
            ScarStore.Modals.saveUserInfo();

            // تفريغ السلة
            ScarStore.Cart.clear();

            // عرض نافذة حسب الدفع
            if (selectedPaymentMethod.requiresPrepayment) {
                const modalHtmlString = ScarStore.Templates.getPaymentInstructionsModalHtml(orderId, totalPrice, selectedPaymentMethod);
                const tempModalDiv = document.createElement('div');
                tempModalDiv.innerHTML = modalHtmlString;

                const amountEl = tempModalDiv.querySelector('#payment-amount-wallet, #payment-amount-ip');
                const orderIdEl = tempModalDiv.querySelector('#payment-order-id-wallet, #payment-order-id-ip');
                if (amountEl) amountEl.textContent = `${totalPrice.toFixed(2)} ${config.currency}`;
                if (orderIdEl) orderIdEl.textContent = orderId;

                ScarStore.Modals.replaceContent(tempModalDiv.innerHTML);

                // تايمر للمحافظ الإلكترونية
                const timerEl = document.getElementById('wallet-timer');
                if (timerEl && selectedPaymentMethod.id === 'e-wallet') {
                    ScarStore.Payment.startTimer('wallet-timer', 15 * 60);
                }
            } else {
                ScarStore.Modals.replaceContent(ScarStore.Templates.getOrderSuccessModalHtml(orderId));
            }

            // حفظ الطلب محليًا
            const storageVersion = config.storageVersion || 'v-fallback';
            const pastOrders = JSON.parse(localStorage.getItem(`scarOrders_${storageVersion}`) || '[]');
            pastOrders.push({ id: orderId, date: new Date().toISOString() });
            localStorage.setItem(`scarOrders_${storageVersion}`, JSON.stringify(pastOrders));

        } else {
            throw new Error(result.message || 'فشل إرسال الطلب');
        }

    } catch (error) {
        console.error('❌ خطأ أثناء إرسال الطلب:', error);
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
            if (!complaintUrl || complaintUrl.trim() === "") {
                ScarStore.Toast.show('عفواً، خدمة الملاحظات غير متاحة حالياً', 'danger');
                return;
            }
            const phoneInput = form.querySelector('#complaint-phone');
            const iti = ScarStore.state.phoneInputInstances[phoneInput.id];
            if (!iti || !iti.isValidNumber()) {
                ScarStore.Toast.show('يرجى إدخال رقم هاتف صحيح', 'danger');
                return;
            }
            const submitBtn = form.querySelector('button[type="submit"]');
            const btnText = submitBtn.querySelector('.button-text');
            const spinner = submitBtn.querySelector('.spinner');
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');
            submitBtn.disabled = true;
            try {
                const formData = new FormData(form);
                formData.set('phone', iti.getNumber());
                formData.append('timestamp', new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' }));
                const mainType = formData.get('type');
                let subType = '';
                if (mainType === 'شكوى') subType = formData.get('problemType');
                else if (mainType === 'استفسار') subType = formData.get('inquiryType');
                formData.append('subType', subType);
                formData.delete('problemType');
                formData.delete('inquiryType');
                if (formData.get('hasPreviousOrder') === 'لا') {
                    formData.delete('orderWithSamePhone');
                    formData.delete('orderId');
                }
                const response = await fetch(complaintUrl, { method: 'POST', body: formData });
                const result = await response.json();
                if (result.result === "success") {
                    const successTemplate = document.getElementById('complaint-success-modal-template');
                    const tempDiv = document.createElement('div');
                    tempDiv.appendChild(successTemplate.content.cloneNode(true));
                    ScarStore.Modals.replaceContent(tempDiv.innerHTML);
                    lucide.createIcons();
                } else {
                    throw new Error(result.message || 'فشل إرسال الرسالة');
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
        
        // ✨ --- تم تحديث هذه الدالة --- ✨
        updateCheckoutSummary() {
            const { cart, storeData: { config } } = ScarStore.state;
            const { currency } = config;
            
            const subtotalEl = document.getElementById('summary-subtotal');
            const shippingEl = document.getElementById('summary-shipping');
            const totalEl = document.getElementById('summary-total');
            // ✨ جديد: استهداف عنصر الهاتف
            const totalMobileEl = document.getElementById('summary-total-mobile'); 

            if (!subtotalEl) return; 

            const shippingOption = document.querySelector('input[name="shipping"]:checked');
            const shippingCost = shippingOption ? parseFloat(shippingOption.dataset.cost) : 0;
            const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            const grandTotal = subtotal + shippingCost;

            subtotalEl.textContent = `${subtotal.toFixed(2)} ${currency}`;
            shippingEl.textContent = `${shippingCost.toFixed(2)} ${currency}`;
            totalEl.textContent = `${grandTotal.toFixed(2)} ${currency}`;
            
            // ✨ جديد: تحديث قيمة عنصر الهاتف أيضاً
            if (totalMobileEl) {
                totalMobileEl.textContent = `${grandTotal.toFixed(2)} ${currency}`;
            }
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

        // ✨ --- دوال جديدة تمت إضافتها --- ✨
        handleGovernorateChange(selectElement) {
            const { governoratesData } = ScarStore.state.storeData.config;
            const selectedGov = selectElement.value;
            const districts = governoratesData ? governoratesData[selectedGov] : [];
            const wrapper = document.getElementById('district-container-wrapper');

            if (!wrapper) return;
            wrapper.innerHTML = ''; // إفراغ الحاوية

            if (districts && districts.length > 0) {
                const optionsHtml = districts.map(dist => `<option value="${dist}">${dist}</option>`).join('');
                const districtSelectHtml = `
                    <div>
                        <label for="customer-district" class="block text-sm font-medium text-slate-700 mb-1">المركز / القسم</label>
                        <select id="customer-district" name="district" class="form-select" required>
                            <option value="">اختر المركز...</option>
                            ${optionsHtml}
                        </select>
                    </div>
                `;
                wrapper.innerHTML = districtSelectHtml;
            }
        },
// استبدل الدالة القديمة بالكامل بهذه النسخة المصححة
async handleGetLocation(btn) {
    // 1. جلب العناصر اللازمة من الصفحة
    const resultDiv = document.getElementById('location-result');
    const linkInput = document.getElementById('location-link-input');
    const buttonContent = btn.querySelector('.button-content');
    const spinner = btn.querySelector('.spinner');

    // 2. التحقق من دعم المتصفح
    if (!navigator.geolocation) {
        const msg = 'متصفحك لا يدعم تحديد الموقع.';
        if (resultDiv) {
            resultDiv.innerHTML = `❌ ${msg}`;
            resultDiv.classList.remove('opacity-0');
        }
        ScarStore.Toast.show(msg, 'danger');
        return;
    }

    // 3. تهيئة الواجهة وبدء التحميل
    btn.disabled = true;
    resultDiv.innerHTML = 'جاري تحديد موقعك...';
    resultDiv.classList.remove('opacity-0');
    
    buttonContent.classList.add('hidden');
    spinner.classList.remove('hidden');
    btn.classList.remove('success-btn-custom');
    btn.classList.add('primary-btn');

    // 4. طلب الموقع الحالي للمستخدم
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            
            // ===== بداية السطر الذي تم تصحيحه =====
            const googleMapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
            // ===== نهاية السطر الذي تم تصحيحه =====
            
            linkInput.value = googleMapsLink;

            // 5. تحديث الواجهة عند النجاح
            resultDiv.innerHTML = `✅ تم التحديث بنجاح. <a href="${googleMapsLink}" target="_blank">افتح الرابط للتأكيد</a>`;

            btn.classList.remove('primary-btn');
            btn.classList.add('success-btn-custom');
            buttonContent.innerHTML = `<i data-lucide="check-circle" class="w-6 h-6"></i> <span>تم التحديد (تحديث)</span>`;
            lucide.createIcons();
            
            spinner.classList.add('hidden');
            buttonContent.classList.remove('hidden');
            btn.disabled = false;
        },
        (error) => {
            // 6. تحديث الواجهة عند حدوث خطأ
            let message = 'فشل تحديد الموقع.';
            if (error.code === 1) message = 'تم رفض الوصول للموقع.';
            resultDiv.innerHTML = `❌ ${message}`;
            
            spinner.classList.add('hidden');
            buttonContent.innerHTML = `<svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor"><path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/></svg><span>إعادة المحاولة</span>`;
            buttonContent.classList.remove('hidden');
            btn.disabled = false;
            
            ScarStore.Toast.show(message, 'danger');
        }
    );
},

    }
});