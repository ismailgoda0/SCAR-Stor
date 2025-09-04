// FILE: app.js

/**
 * ScarStore Main Application File
 * This file contains the core logic for the e-commerce application,
 * including state management, routing, UI rendering, and data handling.
 *
 * @version 1.2.0
 * @author SCAR Development Team
 */

const ScarStore = {
    // Application state containing all dynamic data
    state: {
        storeData: { products: [], categories: [], config: {} },
        productMap: new Map(),
        cart: [],
        wishlist: [],
        priceMode: 'retail', // 'retail' or 'wholesale'
        currentView: 'home', // 'home', 'category', 'product', 'list-page'
        activeMainCategory: null,
        activeSubCategory: null,
        activeBrands: [],
        priceRange: { min: 0, max: 100000 },
        currentSearchTerm: '',
        sortBy: 'default',
        currentPage: 1,
        productsPerPage: 12,
        isInitialLoad: true,
                currentTrackingData: null, 
   orderVerification: {
            orderId: null,
            isVerified: false
        },
        userInfo: { name: null, phone: null, phone_secondary: null, governorate: null, district: null, address: null },
        isAllCategoriesView: false,
        phoneInputInstances: {},
        productViewMode: 'grid', // 'grid' or 'list'

    },
    
    // Cached references to frequently used DOM elements
    DOMElements: {
        preloader: document.getElementById('preloader'),
        appContainer: document.getElementById('app-container'),
        homeContent: document.getElementById('home-content'),
        categoryContent: document.getElementById('category-content'),
        productPageContent: document.getElementById('product-page-content'),
        wishlistButton: document.getElementById('wishlist-button'),
        cartButton: document.getElementById('cart-button'),
        cartTotalPrice: document.getElementById('cart-total-price'),
        wishlistDropdownContainer: document.getElementById('wishlist-dropdown-container'),
        cartDropdownContainer: document.getElementById('cart-dropdown-container'),
        globalSearchInput: document.getElementById('global-search-input'),
        priceModeToggle: document.getElementById('price-mode-toggle'),
        logoLink: document.getElementById('logo-link'),
        toggleCategoriesViewBtn: document.getElementById('toggle-categories-view-btn'),
        categoriesScrollerContainer: document.getElementById('categories-scroller-container'),
        allCategoriesGrid: document.getElementById('all-categories-grid'),
        categoriesContainerSwiper: document.getElementById('categories-container-swiper'),
        bundleOffersSection: document.getElementById('bundle-offers-section'),
        discountsSection: document.getElementById('discounts-section'),
        productsContainer: document.getElementById('products-container'),
        noResults: document.getElementById('no-results'),
        noResultsAction: document.getElementById('no-results-action'),
        paginationContainer: document.getElementById('pagination-container'),
        filterBar: document.getElementById('filter-bar'),
        filterItemsContainer: document.getElementById('filter-items-source'),
        priceSlider: document.getElementById('price-slider'),
        priceLower: document.getElementById('price-lower'),
        priceUpper: document.getElementById('price-upper'),
        localSearchInput: document.getElementById('local-search-input'),
        modalsContainer: document.getElementById('modals-container'),
        toastContainer: document.getElementById('toast-container'),
        lightboxContainer: document.getElementById('lightbox-container'),
        whatsappBtn: document.getElementById('whatsapp-btn'),
        whatsappPopup: document.getElementById('whatsapp-popup'),
        whatsappWidget: document.getElementById('whatsapp-widget'),
        closeWhatsappPopup: document.getElementById('close-whatsapp-popup'),
        sendWhatsappMessage: document.getElementById('send-whatsapp-message'),
        footerYear: document.getElementById('footer-year'),
        footerQuickLinks: document.getElementById('footer-quick-links'),
        footerContactInfo: document.getElementById('footer-contact-info'),
        footerSocialLinks: document.getElementById('footer-social-links'),
        backToTopBtn: document.getElementById('back-to-top-btn'),
        mobileNav: document.getElementById('mobile-nav'),
        mobileWishlistButton: document.getElementById('mobile-wishlist-button'),
        mobileCartButton: document.getElementById('mobile-cart-button'),
        listPageTitle: document.getElementById('list-page-title'),
        productsTitleContainer: document.getElementById('products-title-container'),
    },

    /**
     * Initializes the application.
     */
    async init() {
        this.DOMElements.footerYear.textContent = new Date().getFullYear();
        await this.loadConfig();
        
        const storageVersion = this.state.storeData.config.storageVersion || 'v-fallback';
        this.state.priceMode = localStorage.getItem(`scarPriceMode_${storageVersion}`) || 'retail';
        this.state.cart = JSON.parse(localStorage.getItem(`scarCart_${storageVersion}`)) || [];
        this.state.wishlist = JSON.parse(localStorage.getItem(`scarWishlist_${storageVersion}`)) || [];
        this.state.userInfo = JSON.parse(localStorage.getItem(`scarUserInfo_${storageVersion}`)) || { name: null, phone: null, phone_secondary: null, governorate: null, district: null, address: null };
        this.state.productViewMode = localStorage.getItem(`scarProductView_${storageVersion}`) || 'grid';
        
        this.UI.updatePriceModeToggle();
        await this.loadStoreData();
        this.Events.setup();
        this.Events.setupProductCardHover();
        
        const hasVisited = localStorage.getItem(`scarVisited_${storageVersion}`);
        if (!hasVisited && !this.state.userInfo.phone) {
            setTimeout(() => { this.Modals.promptForPhone(); }, 2000);
            localStorage.setItem(`scarVisited_${storageVersion}`, 'true');
        }

        this.Router.handleRouteChange();
        this.Cart.updateUI();
        this.Wishlist.updateUI();
        this.UI.renderFooter();
        
        // Animate page load
        gsap.to(this.DOMElements.preloader, { 
            duration: 0.5, 
            opacity: 0, 
            onComplete: () => this.DOMElements.preloader.style.display = 'none' 
        });
        gsap.to('body', { duration: 0.5, autoAlpha: 1, ease: 'power1.inOut' });
        gsap.from('#app-container > *', {
            duration: 0.8, y: 30, autoAlpha: 0,
            stagger: 0.2, ease: 'power2.out', delay: 0.3
        });
        this.state.isInitialLoad = false;
    },
    
    /**
     * Loads the configuration file.
     */
    async loadConfig() {
        try {
            const configResponse = await fetch('data/config.json');
            if (!configResponse.ok) throw new Error('Config file not found');
            this.state.storeData.config = await configResponse.json();
            this.state.productsPerPage = this.state.storeData.config.productsPerPage || 12;
        } catch (error) {
            console.error('Failed to load config.json:', error);
            // Provide a fallback config to prevent total app failure
            this.state.storeData.config = {
                currency: "EGP", productsPerPage: 12, storageVersion: "v-error",
                googleSheetcomplaintUrl: "", googleSheetWebAppUrl: ""
            };
        }
    },

    /**
     * Loads product and category data from JSON files.
     */
    async loadStoreData() {
        try {
            const storeDataFile = this.state.priceMode === 'wholesale' ? 'data/store-data-2.json' : 'data/store-data.json';
            const storeResponse = await fetch(storeDataFile);
            if (!storeResponse.ok) throw new Error(`Could not load ${storeDataFile}.`);
            
            const storeData = await storeResponse.json();
            
            if (!storeData || !storeData.products || !storeData.categories) {
                throw new Error("Invalid data structure in JSON file.");
            }

            this.state.storeData.categories = storeData.categories;
            
            const categoryPrefixMap = new Map(this.state.storeData.categories.map(cat => [cat.id, cat.prefix]));

            this.state.storeData.products = storeData.products.map(product => {
                const prefix = categoryPrefixMap.get(product.categoryId) || 'X';
                const fullId = `${prefix}${product.id}`;
                const oldPrice = this.StoreLogic.calculateOldPrice(product, product.basePrice);

                return {
                    ...product,
                    id: fullId,
                    numericId: product.id,
                    price: product.basePrice,
                    oldPrice: oldPrice
                };
            });

            this.state.productMap = new Map(this.state.storeData.products.map(p => [p.id, p]));
            
            this.state.storeData.products.forEach(product => {
                if (product.isBundle) {
                    const calculatedOldPrice = product.items.reduce((total, item) => {
                        const itemProduct = this.state.storeData.products.find(p => p.numericId === item.productId);
                        return total + (itemProduct ? itemProduct.basePrice * item.quantity : 0);
                    }, 0);
                    product.oldPrice = calculatedOldPrice;
                }
            });
            
            const prices = this.state.storeData.products.map(p => p.basePrice);
            this.state.priceRange.min = prices.length > 0 ? Math.floor(Math.min(...prices)) : 0;
            this.state.priceRange.max = prices.length > 0 ? Math.ceil(Math.max(...prices)) : 1000;

            this.setupAutocomplete();
        } catch (error) {
            console.error('Failed to fetch store data:', error);
            
            let title = 'خطأ في تحميل بيانات المتجر';
            let message = 'لا يمكن عرض المنتجات حالياً. يرجى المحاولة مرة أخرى لاحقاً.';

            if (error instanceof SyntaxError && error.message.includes('JSON')) {
                title = 'عفواً';
                message = 'لا يتوفر محتوى في الوقت الحالي. يرجى المراجعة لاحقاً.';
            }
            
            const mainContent = document.querySelector('main');
            if(mainContent){
                 mainContent.innerHTML = ScarStore.Templates.getErrorHtml(title, message);
                 mainContent.dataset.error = "true";
            }
            
            const preloader = document.getElementById('preloader');
            if(preloader) {
                gsap.to(preloader, { 
                    duration: 0.5, 
                    opacity: 0, 
                    onComplete: () => preloader.style.display = 'none' 
                });
            }
            gsap.to('body', { duration: 0.5, autoAlpha: 1 });
        }
    },

    /**
     * Resets and reloads the application data, typically after a mode switch.
     */
    async resetAndReloadApp() {
        localStorage.setItem(`scarPriceMode_${this.state.storeData.config.storageVersion}`, this.state.priceMode);
        await this.loadStoreData();

        if (document.querySelector('main').dataset.error) return;

        this.Router.handleRouteChange();
        this.Cart.updateUI();
        this.Wishlist.updateUI();
        this.UI.renderFooter();
    },
    
    /**
     * Sets up the global search autocomplete functionality.
     */
    setupAutocomplete() {
        new Awesomplete(this.DOMElements.globalSearchInput, {
            list: this.state.storeData.products.map(p => ({
                label: p.name,
                value: p.name,
                image: this.Utils.getProductImageForAutocomplete(p)
            })),
            item: function(text, input) {
                const li = document.createElement("li");
                const img = document.createElement("img");
                img.src = text.image;
                img.className = "w-10 h-10 object-cover rounded-md ml-3";
                img.onerror = function() { this.src='https://placehold.co/100x100/e2e8f0/475569?text=SCAR'; };
                const name = document.createElement("span");
                name.textContent = text.label;
                li.append(img, name);
                return li;
            },
            filter: (text, input) => Awesomplete.FILTER_CONTAINS(text, input.match(/[^,]*$/)[0])
        });
    },

    /**
     * Handles routing based on URL parameters.
     */
    Router: {
        async handleRouteChange() {
            const params = new URLSearchParams(window.location.search);
            const productId = params.get('product');
            const categoryId = params.get('category');
            const view = params.get('view');
            const searchTerm = params.get('search');

            const trackingBanner = document.getElementById('tracking-banner');
            if (trackingBanner) trackingBanner.classList.add('hidden');

            // Hide all main content sections initially
            Object.values(ScarStore.DOMElements).forEach(el => {
                if (el?.id?.endsWith('-content')) el.classList.add('hidden');
            });

            if (view === 'cart' || view === 'wishlist') {
                ScarStore.state.currentView = 'list-page';
                ScarStore.UI.renderListPage(view);
            } else if (productId) {
                ScarStore.state.currentView = 'product';
                await ScarStore.UI.renderProductPage(productId);

                const storageVersion = ScarStore.state.storeData.config.storageVersion || 'v-fallback';
                const namePrompted = localStorage.getItem(`scarNamePrompted_${storageVersion}`);
                if (!ScarStore.state.userInfo.name && !namePrompted) {
                    setTimeout(() => { ScarStore.Modals.promptForName(); }, 1500);
                    localStorage.setItem(`scarNamePrompted_${storageVersion}`, 'true');
                }

            } else if (categoryId || view || searchTerm !== null || params.has('page') || params.has('brand') || params.has('sort') || params.has('minPrice') || params.has('maxPrice')) {
                ScarStore.state.currentView = 'category';
                this.setupCategoryView(params);
            } else {
                ScarStore.state.currentView = 'home';
                document.title = "SCAR | عروض اكسسوارات الجوال";
                ScarStore.UI.renderHomePage();
            }
            window.scrollTo(0, 0);
        },

        setupCategoryView(params) {
            const { DOMElements, state, UI } = ScarStore;
            DOMElements.categoryContent.classList.remove('hidden');
            
            const allProducts = state.storeData.products;
            const defaultMin = allProducts.length > 0 ? Math.floor(Math.min(...allProducts.map(p => p.basePrice))) : 0;
            const defaultMax = allProducts.length > 0 ? Math.ceil(Math.max(...allProducts.map(p => p.basePrice))) : 1000;

            state.currentPage = params.has('page') ? parseInt(params.get('page'), 10) : 1;
            state.currentSearchTerm = params.get('search') || '';
            state.activeBrands = params.has('brand') ? params.get('brand').split(',') : [];
            state.sortBy = params.get('sort') || 'default';
            state.priceRange.min = params.has('minPrice') ? parseInt(params.get('minPrice'), 10) : defaultMin;
            state.priceRange.max = params.has('maxPrice') ? parseInt(params.get('maxPrice'), 10) : defaultMax;
            
            if(DOMElements.localSearchInput) {
                DOMElements.localSearchInput.value = state.currentSearchTerm;
            }
            
            const categoryId = params.get('category');
            if (categoryId) {
                const [mainCat, subCat] = categoryId.split('/');
                state.activeMainCategory = mainCat || 'all-products';
                state.activeSubCategory = subCat || null;
            } else {
                state.activeMainCategory = 'all-products';
                state.activeSubCategory = null;
            }

            UI.renderSidebar();
            UI.renderProducts();
            UI.applyProductViewMode();
        },
        
        navigateTo(url, fromProductPage = false) {
            ScarStore.Modals.closeLast();
        
            if (fromProductPage) {
                sessionStorage.setItem('scarPreviousPage', window.location.href);
            }
            window.history.pushState({}, '', url);
            this.handleRouteChange();
        },

        updateURLWithFilters() {
            const { state } = ScarStore;
            const params = new URLSearchParams();
            
            if(state.activeMainCategory && state.activeMainCategory !== 'all-products') {
                const catPath = state.activeSubCategory ? `${state.activeMainCategory}/${state.activeSubCategory}` : state.activeMainCategory;
                params.set('category', catPath);
            }

            if (state.currentSearchTerm) {
                params.set('search', state.currentSearchTerm);
            }

            if (state.activeBrands.length > 0) {
                params.set('brand', state.activeBrands.join(','));
            }

            if (state.sortBy !== 'default') {
                params.set('sort', state.sortBy);
            }
            
            const allProducts = state.storeData.products;
            const defaultMin = allProducts.length > 0 ? Math.floor(Math.min(...allProducts.map(p => p.basePrice))) : 0;
            const defaultMax = allProducts.length > 0 ? Math.ceil(Math.max(...allProducts.map(p => p.basePrice))) : 1000;

            if (state.priceRange.min !== defaultMin) {
                params.set('minPrice', state.priceRange.min);
            }
            
            if (state.priceRange.max !== defaultMax) {
                params.set('maxPrice', state.priceRange.max);
            }

            if (state.currentPage > 1) {
                params.set('page', state.currentPage);
            }

            const newUrl = `${window.location.pathname}?${params.toString()}`;
            window.history.pushState({ path: newUrl }, '', newUrl);
        }
    },

    /**
     * Contains business logic for the store.
     */
    StoreLogic: {
        calculateCurrentPrice(product, selectedOptions) {
            if (!product) return 0;
            let finalPrice = product.basePrice;

            if (product.variants && selectedOptions) {
                Object.keys(selectedOptions).forEach(variantKey => {
                    if (variantKey === 'موديل الهاتف') return;

                    const selectedValue = selectedOptions[variantKey];
                    const variantOptions = product.variants[variantKey];
                    
                    if (Array.isArray(variantOptions)) {
                        const selectedOptionData = variantOptions.find(opt => {
                            const value = typeof opt === 'object' ? opt.value : opt;
                            return value === selectedValue;
                        });
                        if (selectedOptionData && selectedOptionData.priceModifier) {
                            finalPrice += selectedOptionData.priceModifier;
                        }
                    }
                });
            }
            return finalPrice;
        },

        calculateOldPrice(product, currentPrice) {
            if (product.discountPercentage > 0) {
                const originalPrice = currentPrice / (1 - (product.discountPercentage / 100));
                return Math.round(originalPrice);
            }
            if (product.isBundle) {
                return product.oldPrice; 
            }
            return null;
        },

        getSelectedOptions(productContainer) {
            const selectedOptions = {};
            const productId = productContainer.dataset.id;
            const product = ScarStore.state.productMap.get(productId);
            if (!product) return selectedOptions;
        
            if (ScarStore.state.priceMode === 'wholesale') {
                return ScarStore.Wholesale.getSelectedOptions(productContainer);
            }
        
            if (product.isBundle) {
                // Future logic for bundles with selectable variants
            } else if (product.variants) {
                Object.keys(product.variants).forEach(key => {
                    const name = `option-${productId}-${key}`;
                    let selectedInput = productContainer.querySelector(`[name="${name}"]:checked`);
                    
                    if (selectedInput && selectedInput.value) {
                        selectedOptions[key] = selectedInput.value;
                    } else {
                        // Default to the first option if none is selected
                        const firstOption = product.variants[key][0];
                        if (firstOption) {
                            selectedOptions[key] = typeof firstOption === 'object' ? firstOption.value : firstOption;
                        }
                    }
                });
            }
            return selectedOptions;
        },

        getFilteredProducts(forBrandFilter = false) {
            const { products } = ScarStore.state.storeData;
            const { currentSearchTerm, activeMainCategory, activeSubCategory, activeBrands, sortBy, priceRange } = ScarStore.state;
            
            let filtered = [...products];

            if (currentSearchTerm) {
                const term = currentSearchTerm.toLowerCase().trim();
                filtered = filtered.filter(p =>
                    p.name.toLowerCase().includes(term) ||
                    (p.brand && p.brand.toLowerCase().includes(term)) ||
                    p.id.toLowerCase() === term
                );
            }
            
            if (activeMainCategory && activeMainCategory !== 'all-products') {
                filtered = filtered.filter(p => p.categoryId === activeMainCategory);
            }
            if (activeSubCategory) {
                filtered = filtered.filter(p => p.subCategoryId === activeSubCategory);
            }
            
            // If we only need the list to populate the brand filter, we return it here
            if (forBrandFilter) {
                return filtered;
            }

            if (activeBrands.length > 0) {
                filtered = filtered.filter(p => p.brand && activeBrands.includes(p.brand));
            }
            
            filtered = filtered.filter(p => p.basePrice >= priceRange.min && p.basePrice <= priceRange.max);
            
            if (sortBy === 'price-asc') filtered.sort((a, b) => a.basePrice - b.basePrice);
            else if (sortBy === 'price-desc') filtered.sort((a, b) => b.basePrice - a.basePrice);
            
            return filtered;
        },

        getFilteredList(sourceProducts) {
            const { currentSearchTerm, activeBrands, sortBy, priceRange } = ScarStore.state;
            let filtered = [...sourceProducts];

            if (currentSearchTerm) {
                const term = currentSearchTerm.toLowerCase().trim();
                filtered = filtered.filter(p => p.name.toLowerCase().includes(term) || p.id.toLowerCase() === term);
            }
            if (activeBrands.length > 0) {
                filtered = filtered.filter(p => p.brand && activeBrands.includes(p.brand));
            }
            filtered = filtered.filter(p => p.basePrice >= priceRange.min && p.basePrice <= priceRange.max);
            if (sortBy === 'price-asc') filtered.sort((a, b) => a.basePrice - b.basePrice);
            else if (sortBy === 'price-desc') filtered.sort((a, b) => b.basePrice - a.basePrice);
            
            return filtered;
        }
    },

    /**
     * Utility functions.
     */
    Utils: {
        getPageTitle() {
            const { activeMainCategory, activeSubCategory, storeData, currentSearchTerm } = ScarStore.state;
            
            if (currentSearchTerm) {
                return `نتائج البحث عن: "${currentSearchTerm}"`;
            }
            
            const params = new URLSearchParams(window.location.search);
            if (params.get('view') === 'special-offers') {
                return 'العروض الخاصة';
            }
            if (params.get('view') === 'wishlist') {
                return 'قائمة المفضلة';
            }
            if (params.get('category') === 'bundles') {
                 return 'عروض الباقات';
            }

            if (activeSubCategory) {
                const mainCat = storeData.categories.find(c => c.id === activeMainCategory);
                const subCat = mainCat?.subCategories.find(s => s.id === activeSubCategory);
                return subCat ? subCat.name : 'منتجات القسم';
            }
            
            if (activeMainCategory && activeMainCategory !== 'all-products') {
                const mainCat = storeData.categories.find(c => c.id === activeMainCategory);
                return mainCat ? mainCat.name : 'كل المنتجات';
            }
            
            return 'كل المنتجات';
        },

        getProductImageForAutocomplete(p) {
            if (p.isBundle && p.images && p.images.length > 0) {
                return p.images[0];
            }
            if (p.heroImage) {
                return p.heroImage;
            }
            if (p.isBundle) {
                const firstItem = ScarStore.state.productMap.get(p.items[0]?.productId);
                return firstItem?.images?.[0];
            }
            return p.images?.[0];
        }
    },

    /**
     * Handles toast notifications.
     */
    Toast: {
        show(message, type = 'info', duration = 3000) {
            const container = ScarStore.DOMElements.toastContainer;
            if (!container) return;

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            const iconName = { success: 'check-circle', danger: 'alert-circle', info: 'info' }[type];
            toast.innerHTML = `<i data-lucide="${iconName}" class="w-6 h-6"></i><span>${message}</span>`;
            
            toast.style.visibility = 'hidden';
            container.appendChild(toast);
            lucide.createIcons();

            requestAnimationFrame(() => {
                toast.style.visibility = 'visible';
                
                if (typeof gsap === 'undefined') {
                    console.error("GSAP is not loaded. Toast animations will not work.");
                    toast.style.opacity = 1;
                    toast.style.transform = 'translateX(0)';
                    return;
                }

                gsap.fromTo(toast,
                    { autoAlpha: 0, x: '-120%' },
                    { duration: 0.5, autoAlpha: 1, x: '0%', ease: 'power2.out' }
                );

                gsap.to(toast, {
                    delay: duration / 1000,
                    duration: 0.4,
                    autoAlpha: 0,
                    x: '-120%',
                    ease: 'power2.in',
                    onComplete: () => toast.remove()
                });
            });
        }
    },

    /**
     * Handles all UI rendering and updates.
     */
    UI: {
        syncProductCardViews(productId) {
            const productViews = document.querySelectorAll(`.product-card[data-id="${productId}"], #product-page-content[data-id="${productId}"]`);
            productViews.forEach(view => this.updateProductCardState(view));
        },
        
        updateProductCardState(container) {
            if (!container) return;
            const productId = container.dataset.id;
            const product = ScarStore.state.productMap.get(productId);
            if (!product) return;
            
            const isPageLayout = container.id === 'product-page-content';
            const actionButtonContainer = container.querySelector('.action-button-container');
            const variantsContainer = container.querySelector('.variants-container');
            
            if (variantsContainer && variantsContainer.innerHTML.trim() === '') {
                const initialSelectedOptions = ScarStore.StoreLogic.getSelectedOptions(container);
                variantsContainer.innerHTML = ScarStore.Templates.getVariantsHtml(product, !isPageLayout, initialSelectedOptions);
                this.initializeSearchableSelects(container);
            }
            
            const isLoved = ScarStore.state.wishlist.includes(productId);
            const loveBtn = container.querySelector(`.love-btn[data-id="${productId}"]`);
            if (loveBtn) loveBtn.classList.toggle('is-loved', isLoved);
            if (container.classList.contains('product-card')) container.classList.toggle('is-loved', isLoved);
            
            if (product.stock <= 0) {
                if (actionButtonContainer) actionButtonContainer.innerHTML = `<button disabled class="primary-btn w-full !text-sm !py-2">نفدت الكمية</button>`;
                return;
            }
            
            const selectedOptionsForCart = ScarStore.StoreLogic.getSelectedOptions(container);
            const cartItemId = ScarStore.Cart.generateCartItemId(productId, selectedOptionsForCart);
            const cartItem = ScarStore.state.cart.find(item => item.cartId === cartItemId);
            
            if (actionButtonContainer) {
                actionButtonContainer.innerHTML = '';
                actionButtonContainer.appendChild(ScarStore.Templates.getCardActionControlsHtml(product, cartItem));
            }
            
            if (ScarStore.state.priceMode === 'wholesale' && product.variants && product.variants['موديل الهاتف']) {
                ScarStore.Wholesale.renderCardUI(container, product, cartItem, isPageLayout);
            }

            this.updatePriceDisplay(container);
            lucide.createIcons();
        },
        
        initializeSearchableSelects(container) {
            if (!window.TomSelect) return;

            container.querySelectorAll('select.variant-model-select').forEach(select => {
                if (select.tomselect) {
                    select.tomselect.destroy();
                }
                const ts = new TomSelect(select, { 
                    create: false,
                    placeholder: "اختر الموديل..."
                });
                if (ts.control) ts.control.removeAttribute('id');
            });

            const brandSelect = document.getElementById('filter-brand');
            if (brandSelect && !brandSelect.tomselect) {
                new TomSelect(brandSelect, {
                    plugins: ['remove_button'],
                    maxItems: 5,
                    dropdownParent: 'body',
                    onItemAdd: function() {
                        this.setTextboxValue('');
                        this.refreshOptions(false);
                    }
                });
            }
        },
        
        updatePriceDisplay(productContainer) {
            if (!productContainer) return;
            const productId = productContainer.dataset.id;
            const product = ScarStore.state.productMap.get(productId);
            if (!product) return;

            const selectedOptions = ScarStore.StoreLogic.getSelectedOptions(productContainer);
            const finalPrice = ScarStore.StoreLogic.calculateCurrentPrice(product, selectedOptions);
            const oldPrice = ScarStore.StoreLogic.calculateOldPrice(product, finalPrice);

            const priceEl = productContainer.querySelector('.product-price');
            const oldPriceEl = productContainer.querySelector('.product-old-price');
            const { currency } = ScarStore.state.storeData.config;

            if (priceEl) priceEl.textContent = `${finalPrice.toFixed(2)} ${currency}`;
            
            if (oldPriceEl) {
                if (oldPrice && oldPrice > finalPrice) {
                    oldPriceEl.textContent = `${oldPrice.toFixed(2)} ${currency}`;
                    oldPriceEl.classList.remove('hidden');
                } else {
                    oldPriceEl.classList.add('hidden');
                }
            }
        },

        renderHomePage() {
            const { DOMElements } = ScarStore;
            DOMElements.homeContent.classList.remove('hidden');
            document.getElementById('tracking-banner').classList.remove('hidden');
            this.renderHomeCategories();
            this.renderBundleOffers();
            this.renderDiscountedProducts();
        },

        renderHomeCategories() {
            const { categoriesScrollerContainer, allCategoriesGrid, categoriesContainerSwiper, toggleCategoriesViewBtn } = ScarStore.DOMElements;
            if (!toggleCategoriesViewBtn) return;
            const isGridView = ScarStore.state.isAllCategoriesView;

            categoriesScrollerContainer.classList.toggle('hidden', isGridView);
            allCategoriesGrid.classList.toggle('hidden', !isGridView);
            
            const btnText = toggleCategoriesViewBtn.querySelector('span');
            const currentIcon = toggleCategoriesViewBtn.querySelector('i, svg');
            const newIcon = document.createElement('i');
            newIcon.className = 'w-5 h-5';
            
            const allCategories = [{ id: "all-products", name: "كل الأقسام", icon: "layout-grid" }, ...ScarStore.state.storeData.categories];

            if (isGridView) {
                btnText.textContent = 'عرض أقل';
                newIcon.setAttribute('data-lucide', 'arrow-up-right');
                const categoryFragments = allCategories.map(cat => ScarStore.Templates.getCategoryHtml(cat, false));
                allCategoriesGrid.replaceChildren(...categoryFragments);
            } else {
                btnText.textContent = 'عرض الكل';
                newIcon.setAttribute('data-lucide', 'layout-grid');
                const categoryFragments = allCategories.map(cat => ScarStore.Templates.getCategoryHtml(cat, true));
                categoriesContainerSwiper.replaceChildren(...categoryFragments);
                
                const swiperContainer = document.querySelector('.categories-swiper');
                if (swiperContainer?.swiper) swiperContainer.swiper.destroy(true, true);
                new Swiper('.categories-swiper', {
                    slidesPerView: 'auto', spaceBetween: 16,
                    navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
                    mousewheel: { forceToAxis: true }, freeMode: true,
                });
            }
            if(currentIcon) currentIcon.replaceWith(newIcon);
            lucide.createIcons();
        },

        renderBundleOffers() {
            const { bundleOffersSection } = ScarStore.DOMElements;
            if (!bundleOffersSection) return;
            const bundles = ScarStore.state.storeData.products.filter(p => p.isBundle).slice(0, 4);
            if (bundles.length > 0) {
                bundleOffersSection.innerHTML = ''; 
                const offerRow = ScarStore.Templates.getProductRowHtml('عروض خاصة', bundles, '?category=bundles');
                bundleOffersSection.appendChild(offerRow);
                offerRow.querySelectorAll('.product-card').forEach(card => {
                    this.syncProductCardViews(card.dataset.id);
                });
                this.initializeSearchableSelects(offerRow);
            } else {
                bundleOffersSection.innerHTML = '';
            }
        },

        renderDiscountedProducts() {
            const { discountsSection } = ScarStore.DOMElements;
            if (!discountsSection) return;
            const discounts = ScarStore.state.storeData.products.filter(p => p.discountPercentage > 0 && !p.isBundle).slice(0, 4);
            if(discounts.length > 0) {
                discountsSection.innerHTML = '';
                const discountRow = ScarStore.Templates.getProductRowHtml('الخصومات', discounts, '?view=special-offers');
                discountsSection.appendChild(discountRow);
                discountRow.querySelectorAll('.product-card').forEach(card => {
                    this.syncProductCardViews(card.dataset.id);
                });
                this.initializeSearchableSelects(discountsSection);
            }
        },
        
        renderSidebar() {
            const filterItemsContainer = ScarStore.DOMElements.filterItemsContainer;
            const { sortBy, activeBrands } = ScarStore.state;
            
            const sortOptions = filterItemsContainer.querySelector('#sort-options');
            const filterBrandSelect = filterItemsContainer.querySelector('#filter-brand');

            const productsForBrandCount = ScarStore.StoreLogic.getFilteredProducts(true);
            const allUniqueBrands = [...new Set(productsForBrandCount.map(p => p.brand).filter(Boolean))].sort();
            
            filterBrandSelect.innerHTML = allUniqueBrands.map(brand => {
                const isSelected = activeBrands.includes(brand);
                return `<option value="${brand}" ${isSelected ? 'selected' : ''}>${brand}</option>`;
            }).join('');
            
            sortOptions.innerHTML = `
                <option value="default" ${sortBy === 'default' ? 'selected' : ''}>افتراضي</option>
                <option value="price-asc" ${sortBy === 'price-asc' ? 'selected' : ''}>السعر: من الأقل للأعلى</option>
                <option value="price-desc" ${sortBy === 'price-desc' ? 'selected' : ''}>السعر: من الأعلى للأقل</option>
            `;
            sortOptions.value = sortBy;

            const wrapper = document.getElementById('filter-nav-wrapper');
            const moreContainer = document.getElementById('more-filters-container');

            if (wrapper && filterItemsContainer) {
                wrapper.querySelectorAll('.filter-item:not(#more-filters-container)').forEach(item => item.remove());
                const sourceItems = Array.from(filterItemsContainer.children);
                sourceItems.forEach(item => {
                    wrapper.insertBefore(item.cloneNode(true), moreContainer);
                });
            }
            
            this.setupPriceSlider();
            this.initializeSearchableSelects(document.getElementById('filter-bar')); 
            
            setTimeout(() => {
                const moreFiltersBtn = document.querySelector('#more-filters-toggle-btn');
                if (moreFiltersBtn) {
                    bootstrap.Dropdown.getOrCreateInstance(moreFiltersBtn);
                }
                this.handleFilterBarResponsiveness();
            }, 150);
        },
        
        handleFilterBarResponsiveness() {
            const wrapper = document.getElementById('filter-nav-wrapper');
            const moreContainer = document.getElementById('more-filters-container');
            const moreDropdown = document.getElementById('more-filters-dropdown');
            const moreCountBadge = document.getElementById('more-filters-count');
        
            if (!wrapper || !moreContainer || !moreDropdown) return;

            // Move items back to the bar before recalculating
            const movedItems = Array.from(moreDropdown.querySelectorAll('.filter-item'));
            movedItems.forEach(item => wrapper.insertBefore(item, moreContainer));

            moreContainer.style.visibility = 'hidden';
            moreDropdown.innerHTML = '';
            let movedCount = 0;

            // Move items to dropdown if they overflow
            while (wrapper.scrollWidth > wrapper.offsetWidth) {
                const itemToMove = moreContainer.previousElementSibling;
                if (!itemToMove) break;
                
                moreDropdown.prepend(itemToMove);
                movedCount++;
            }
            
            if (movedCount > 0) {
                moreCountBadge.textContent = movedCount;
                moreContainer.style.visibility = 'visible';
            }
        },
        
        setupPriceSlider() {
            const priceSlider = document.getElementById('price-slider');
            const priceLower = document.getElementById('price-lower');
            const priceUpper = document.getElementById('price-upper');

            if (!priceSlider || !priceLower || !priceUpper) return;
            if (priceSlider.noUiSlider) priceSlider.noUiSlider.destroy();
            
            const { config } = ScarStore.state.storeData;
            const { min, max } = ScarStore.state.priceRange;

            const allProducts = ScarStore.state.storeData.products;
            const defaultMin = config.defaultMinPrice ?? (allProducts.length > 0 ? Math.floor(Math.min(...allProducts.map(p => p.basePrice))) : 0);
            const defaultMax = config.defaultMaxPrice ?? (allProducts.length > 0 ? Math.ceil(Math.max(...allProducts.map(p => p.basePrice))) : 10000);

            if (defaultMin >= defaultMax) {
                priceSlider.setAttribute('disabled', true);
                priceLower.textContent = `${defaultMin} ${config.currency}`;
                priceUpper.textContent = `${defaultMax} ${config.currency}`;
                return;
            }
            priceSlider.removeAttribute('disabled');

            noUiSlider.create(priceSlider, {
                start: [min, max], connect: true, direction: 'rtl',
                range: { 'min': defaultMin, 'max': defaultMax }, step: 10,
                format: { to: v => Math.round(v), from: v => Number(v) }
            });

            priceSlider.noUiSlider.on('update', (values) => {
                priceLower.textContent = `${values[0]} ${config.currency}`;
                priceUpper.textContent = `${values[1]} ${config.currency}`;
                document.getElementById('price-filter-display').textContent = `${values[0]} - ${values[1]}`;
            });

            priceSlider.noUiSlider.on('change', (values) => {
                ScarStore.state.priceRange.min = values[0];
                ScarStore.state.priceRange.max = values[1];
                ScarStore.state.currentPage = 1;
                ScarStore.Router.updateURLWithFilters();
                ScarStore.UI.renderProducts();
            });
        },
        
        renderProducts() {
            const { productsContainer, noResults, filterBar, paginationContainer, noResultsAction, listPageTitle, productsTitleContainer } = ScarStore.DOMElements;
            const productsSection = document.getElementById('products-section');

            if (listPageTitle) listPageTitle.classList.add('hidden');
            if (productsTitleContainer) productsTitleContainer.classList.remove('hidden');

            const allFilteredProducts = ScarStore.StoreLogic.getFilteredProducts();

            if (productsTitleContainer) {
                productsTitleContainer.innerHTML = ''; 
                const { categories } = ScarStore.state.storeData;
                const { activeMainCategory, activeSubCategory } = ScarStore.state;

                const mainSelect = document.createElement('select');
                mainSelect.className = 'category-select main-category-select';
                mainSelect.onchange = (e) => ScarStore.Router.navigateTo(`?category=${e.target.value}`);
                let allProductsOption = new Option("كل المنتجات", "all-products");
                mainSelect.add(allProductsOption);
                categories.forEach(cat => {
                    let option = new Option(cat.name, cat.id);
                    mainSelect.add(option);
                });
                mainSelect.value = activeMainCategory || 'all-products';
                productsTitleContainer.appendChild(mainSelect);

                const mainCatData = categories.find(c => c.id === activeMainCategory);
                if (mainCatData && mainCatData.subCategories && mainCatData.subCategories.length > 0) {
                    const subSelect = document.createElement('select');
                    subSelect.className = 'category-select sub-category-select';
                    subSelect.onchange = (e) => {
                        const url = e.target.value ? `?category=${activeMainCategory}/${e.target.value}` : `?category=${activeMainCategory}`;
                        ScarStore.Router.navigateTo(url);
                    };
                    let allSubOption = new Option(`كل ${mainCatData.name}`, "");
                    subSelect.add(allSubOption);
                    mainCatData.subCategories.forEach(subCat => {
                        let option = new Option(subCat.name, subCat.id);
                        subSelect.add(option);
                    });
                    subSelect.value = activeSubCategory || "";
                    productsTitleContainer.appendChild(subSelect);
                }

                const productCountDiv = document.createElement('div');
                productCountDiv.className = 'ml-auto text-slate-500 font-semibold text-lg whitespace-nowrap hidden sm:block';
                productCountDiv.innerHTML = `<span>(${allFilteredProducts.length}) منتج</span>`;
                productsTitleContainer.appendChild(productCountDiv);
            }
            
            this.renderSkeletonLoader();
            
            setTimeout(() => { 
                const hasResults = allFilteredProducts.length > 0;
                
                productsSection.classList.toggle('hidden', !hasResults);
                noResults.classList.toggle('hidden', hasResults);
                filterBar.classList.remove('hidden');
                paginationContainer.classList.remove('hidden');
                
                if (hasResults) {
                    const startIndex = (ScarStore.state.currentPage - 1) * ScarStore.state.productsPerPage;
                    const paginatedProducts = allFilteredProducts.slice(startIndex, startIndex + ScarStore.state.productsPerPage);
                    const productFragments = paginatedProducts.map(p => ScarStore.Templates.getProductCardHtml(p));
                    productsContainer.replaceChildren(...productFragments);
                    
                    productsContainer.querySelectorAll('.product-card').forEach(card => {
                        this.syncProductCardViews(card.dataset.id);
                    });
                    this.renderPagination(allFilteredProducts.length);
                    this.initializeSearchableSelects(productsContainer);
                    this.applyProductViewMode(); 
                } else {
                    productsContainer.innerHTML = '';
                    this.renderPagination(0);
                    noResultsAction.innerHTML = `<a href="/" class="primary-btn mt-4 interactive-btn">العودة للرئيسية</a>`;
                }
                lucide.createIcons();
            }, 300);
        },

        renderListPage(type) {
            const { categoryContent, homeContent, productPageContent, productsContainer, listPageTitle, productsTitleContainer, filterBar, paginationContainer, noResults, noResultsAction } = ScarStore.DOMElements;

            homeContent.classList.add('hidden');
            productPageContent.classList.add('hidden');
            categoryContent.classList.remove('hidden');
            
            productsTitleContainer.classList.add('hidden'); 
            listPageTitle.classList.remove('hidden');   
            
            filterBar.classList.remove('hidden');
            paginationContainer.classList.add('hidden');

            const isCart = type === 'cart';
            const title = isCart ? 'سلة المشتريات' : 'قائمة المفضلة';
            const sourceList = isCart ? ScarStore.state.cart : ScarStore.state.wishlist;

            const productIds = isCart ? sourceList.map(item => item.id) : sourceList;
            const uniqueProductIds = [...new Set(productIds)];
            let productsToDisplay = uniqueProductIds.map(id => ScarStore.state.productMap.get(id)).filter(Boolean);
            
            productsToDisplay = ScarStore.StoreLogic.getFilteredList(productsToDisplay);

            listPageTitle.innerHTML = `${title} <span class="text-lg text-slate-500 font-medium">(${productsToDisplay.length} منتج)</span>`;
            document.title = `${title} | SCAR`;

            if (productsToDisplay.length > 0) {
                noResults.classList.add('hidden');
                productsContainer.parentElement.classList.remove('hidden');
                const productFragments = productsToDisplay.map(p => ScarStore.Templates.getProductCardHtml(p));
                productsContainer.replaceChildren(...productFragments);

                productsContainer.querySelectorAll('.product-card').forEach(card => {
                    ScarStore.UI.syncProductCardViews(card.dataset.id);
                });
                ScarStore.UI.initializeSearchableSelects(productsContainer);
                ScarStore.UI.renderSidebar(); 
                ScarStore.UI.applyProductViewMode();
            } else {
                productsContainer.parentElement.classList.add('hidden');
                noResults.classList.remove('hidden');
                noResults.querySelector('h2').textContent = isCart ? 'سلة المشتريات فارغة' : 'قائمة المفضلة فارغة';
                noResults.querySelector('p').textContent = isCart ? 'أضف منتجات إلى سلتك لعرضها هنا.' : 'أضف منتجات إلى مفضلتك لعرضها هنا.';
                noResultsAction.innerHTML = `<a href="?category=all-products" class="primary-btn mt-4 interactive-btn">تصفح كل المنتجات</a>`;
            }
            lucide.createIcons();
        },
        
        renderSkeletonLoader(fullPage = false) {
            const { productsContainer, bundleOffersSection, discountsSection } = ScarStore.DOMElements;
            const skeletonHtml = ScarStore.Templates.getSkeletonCardHtml();
            
            if (fullPage) {
                const skeletonRow = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">${skeletonHtml.repeat(4)}</div>`;
                bundleOffersSection.innerHTML = skeletonRow;
                discountsSection.innerHTML = skeletonRow;
            } else {
                productsContainer.innerHTML = skeletonHtml.repeat(ScarStore.state.productsPerPage);
            }
        },

        renderPagination(totalProducts) {
            const { paginationContainer } = ScarStore.DOMElements;
            const { currentPage, productsPerPage } = ScarStore.state;
            const totalPages = Math.ceil(totalProducts / productsPerPage);

            paginationContainer.innerHTML = '';
            if (totalPages <= 1) return;

            const getPaginationModel = (currentPage, totalPages, siblings = 1) => {
                const totalSlots = siblings * 2 + 5; 

                if (totalPages <= totalSlots) {
                    return Array.from({ length: totalPages }, (_, i) => i + 1);
                }

                const pages = [];
                const showLeftEllipsis = currentPage - siblings > 2;
                const showRightEllipsis = currentPage + siblings < totalPages - 1;

                pages.push(1);
                if (showLeftEllipsis) pages.push('...');

                const startPage = Math.max(2, currentPage - siblings);
                const endPage = Math.min(totalPages - 1, currentPage + siblings);
                
                for (let i = startPage; i <= endPage; i++) {
                    pages.push(i);
                }

                if (showRightEllipsis) pages.push('...');
                
                pages.push(totalPages);
                
                return pages;
            };

            const pageModel = getPaginationModel(currentPage, totalPages);
            
            let paginationHtml = `<button class="pagination-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>السابق</button>`;

            paginationHtml += pageModel.map(page => {
                if (page === '...') {
                    return `<span class="pagination-btn !cursor-default">...</span>`;
                }
                return `<button class="pagination-btn ${page === currentPage ? 'active' : ''}" data-page="${page}">${page}</button>`;
            }).join('');

            paginationHtml += `<button class="pagination-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>التالي</button>`;

            paginationContainer.innerHTML = paginationHtml;
        },

        async renderProductPage(productId) {
            const { productPageContent } = ScarStore.DOMElements;
            
            productPageContent.innerHTML = `<div class="text-center py-16"><div class="spinner mx-auto !w-12 !h-12 !border-4 !border-t-indigo-500"></div></div>`;
            productPageContent.classList.remove('hidden');

            const product = ScarStore.state.productMap.get(productId);

            if (!product) {
                productPageContent.innerHTML = '';
                productPageContent.appendChild(ScarStore.Templates.getErrorHtml('المنتج غير موجود', 'عفواً، لم نتمكن من العثور على المنتج الذي تبحث عنه.'));
                return;
            }
            
            document.title = `${product.name} | SCAR`;
            document.querySelector('meta[name="description"]').setAttribute("content", product.description);

            productPageContent.innerHTML = '';
            const productPageElement = ScarStore.Templates.getProductPageHtml(product);
            productPageContent.appendChild(productPageElement);
            productPageContent.dataset.id = productId;

            this.renderSimilarProducts(product);

            if (ScarStore.state.priceMode === 'wholesale' && product.variants && product.variants['موديل الهاتف']) {
                ScarStore.Wholesale.initializeCardSelection(productPageContent, product);
            }
                                                                                                        
            this.syncProductCardViews(productId);
            this.initializeSearchableSelects(productPageContent);
            lucide.createIcons();
        },

        renderSimilarProducts(currentProduct) {
            const { productPageContent } = ScarStore.DOMElements;
            if (!currentProduct) return;

            let similarProducts = ScarStore.state.storeData.products.filter(p => {
                if (p.id === currentProduct.id) return false;
                if (currentProduct.subCategoryId && p.subCategoryId === currentProduct.subCategoryId) return true;
                if (p.categoryId === currentProduct.categoryId) return true;
                return false;
            });
            
            const subCategoryMatches = similarProducts.filter(p => p.subCategoryId === currentProduct.subCategoryId);
            if(subCategoryMatches.length >= 4) {
                similarProducts = subCategoryMatches;
            }

            const finalSimilarList = similarProducts.slice(0, 4);

            if (finalSimilarList.length > 0) {
                const similarProductsSection = document.createElement('div');
                similarProductsSection.id = 'similar-products-section';
                similarProductsSection.className = 'mt-12';
                
                const similarRow = ScarStore.Templates.getProductRowHtml('منتجات مشابهة', finalSimilarList, `?category=${currentProduct.categoryId}`);
                similarProductsSection.appendChild(similarRow);
                
                productPageContent.appendChild(similarProductsSection);

                similarProductsSection.querySelectorAll('.product-card').forEach(card => {
                    this.syncProductCardViews(card.dataset.id);
                });
                this.initializeSearchableSelects(similarProductsSection);
            }
        },
        
        renderFooter() {
            const { config } = ScarStore.state.storeData;
            if (!config) return;
            ScarStore.DOMElements.footerQuickLinks.innerHTML = `
                <li><a href="/" class="hover:text-indigo-600">الرئيسية</a></li>
                <li><a href="?category=all-products" class="hover:text-indigo-600">كل المنتجات</a></li>
                <li><a href="#" id="feedback-btn-footer" class="hover:text-indigo-600">الشكاوى والملاحظات</a></li>
            `;
            // Re-bind event for the new footer button
            document.getElementById('feedback-btn-footer')?.addEventListener('click', () => ScarStore.Modals.showComplaintModal());

            ScarStore.DOMElements.footerContactInfo.innerHTML = `
                ${config.phone ? `<p><strong>الهاتف:</strong> <a href="tel:${config.phone}" class="hover:text-indigo-600">${config.phone}</a></p>` : ''}
                ${config.address ? `<p><strong>العنوان:</strong> ${config.address}</p>` : ''}
            `;
            const socialLinks = {
                facebook: config.facebook, 
                youtube: config.youtube, 
                tiktok: config.tiktok,
                'message-circle': config.whatsappNumber ? `https://wa.me/${config.whatsappNumber}` : null
            };
            ScarStore.DOMElements.footerSocialLinks.innerHTML = Object.entries(socialLinks)
                .filter(([, url]) => url)
                .map(([icon, url]) => `<a href="${url}" target="_blank" class="text-slate-500 hover:text-indigo-600"><i data-lucide="${icon}" class="animated-icon"></i></a>`)
                .join('');
            lucide.createIcons();
        },
        
        updatePriceModeToggle() {
            const { priceModeToggle } = ScarStore.DOMElements;
            const isWholesale = ScarStore.state.priceMode === 'wholesale';
            
            priceModeToggle.classList.toggle('wholesale', isWholesale);
            priceModeToggle.querySelector('span').textContent = isWholesale ? 'جملة' : 'قطاعي';
        },
        
        setProductViewMode(mode) {
            ScarStore.state.productViewMode = mode;
            const storageVersion = ScarStore.state.storeData.config.storageVersion || 'v-fallback';
            localStorage.setItem(`scarProductView_${storageVersion}`, mode);
            this.applyProductViewMode();
        },
        
        applyProductViewMode() {
            const { productViewMode } = ScarStore.state;
            const gridBtn = document.getElementById('view-mode-grid');
            const listBtn = document.getElementById('view-mode-list');
            const container = document.getElementById('products-container');

            if (!gridBtn || !listBtn || !container) return;
            
            if (productViewMode === 'list') {
                container.classList.remove('grid', 'grid-cols-1', 'sm:grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4');
                container.classList.add('is-list-view');
                listBtn.classList.add('bg-indigo-100', 'text-indigo-600');
                gridBtn.classList.remove('bg-indigo-100', 'text-indigo-600');
            } else {
                container.classList.remove('is-list-view');
                container.classList.add('grid', 'grid-cols-1', 'sm:grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4');
                gridBtn.classList.add('bg-indigo-100', 'text-indigo-600');
                listBtn.classList.remove('bg-indigo-100', 'text-indigo-600');
            }
        },
    }
};
