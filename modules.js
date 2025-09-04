// FILE: modules.js
if (!window.ScarStore) { window.ScarStore = {}; }

Object.assign(ScarStore, {
   Templates: {

// استبدل الدالة القديمة بهذه النسخة المحدثة
  getCartDropdownHtml() {
            const { cart } = ScarStore.state;
            const { currency } = ScarStore.state.storeData.config;
            const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            let itemsHtml;

            if (cart.length === 0) {
                itemsHtml = `<div class="text-center text-slate-500 py-10 flex flex-col items-center gap-4"><i data-lucide="shopping-cart" class="w-16 h-16 text-slate-300"></i><p>سلتك فارغة حالياً.</p></div>`;
            } else {
                const itemNodes = cart.map(item => this.getCartItemPreviewHtml(item));
                const tempDiv = document.createElement('div');
                tempDiv.append(...itemNodes);
                itemsHtml = tempDiv.innerHTML;
            }

            return `
                <div id="cart-dropdown" class="header-dropdown">
                    <div class="p-4 border-b flex justify-between items-center">
                        <h3 class="font-bold text-lg">سلة التسوق</h3>
                        ${cart.length > 0 ? `<button id="clear-cart-btn" class="text-sm text-red-500 hover:underline flex items-center gap-1.5"><i data-lucide="trash" class="w-4 h-4"></i>إفراغ السلة</button>` : ''}
                    </div>
                    <div id="cart-dropdown-items" class="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-4">${itemsHtml}</div>
                    ${cart.length > 0 ? `
                    <div class="p-4 border-t bg-slate-50 space-y-3">
                        <div class="flex justify-between font-bold text-lg">
                            <span>المجموع:</span>
                            <span>${total.toFixed(2)} ${currency}</span>
                        </div>
                        <a href="?view=cart" id="show-cart-products-btn" class="w-full text-center py-2 px-4 bg-slate-200 text-slate-800 font-bold rounded-lg hover:bg-slate-300 transition-colors block">عرض السلة في صفحة</a>
                        <button id="checkout-btn" class="primary-btn w-full">إتمام الشراء</button>
                    </div>
                    ` : ''}
                </div>
            `;
        },

        getCartItemPreviewHtml(item) {
            const product = ScarStore.state.productMap.get(item.id);
            if (!product) return document.createDocumentFragment();

            const template = document.getElementById('cart-item-template');
            const clone = template.content.cloneNode(true);
            const itemTotal = (item.price * item.quantity).toFixed(2);
            const imageUrl = (product.isBundle && product.images && product.images.length > 0) ? product.images[0] : product.heroImage || (product.isBundle ? ScarStore.state.productMap.get(product.items[0].productId)?.images[0] : product.images[0]);
            
            clone.querySelector('.cart-item-preview').dataset.cartId = item.cartId;
            clone.querySelector('.cart-item-preview').dataset.id = item.id;
            clone.querySelector('a').href = `?product=${product.id}`;
            clone.querySelector('.cart-item-image').src = imageUrl;
            clone.querySelector('.cart-item-image').alt = product.name;
            clone.querySelector('.cart-item-image').onerror = function() { this.src='https://placehold.co/100x100/e2e8f0/475569?text=SCAR'; };
            clone.querySelector('.cart-item-name').textContent = product.name;
            clone.querySelector('.cart-item-name').href = `?product=${product.id}`;
            
            const variantsContainer = clone.querySelector('.cart-item-variants');
            if (product.variants) {
                variantsContainer.innerHTML = this.getVariantsHtml(product, true, item.options, item.cartId);
            }

            clone.querySelector('[data-action="increase-cart-qty"]').dataset.cartId = item.cartId;
            clone.querySelector('[data-action="decrease-cart-qty"]').dataset.cartId = item.cartId;
            clone.querySelector('.cart-item-quantity').textContent = item.quantity;
            clone.querySelector('.cart-item-total').textContent = `${itemTotal} ${ScarStore.state.storeData.config.currency}`;
            const removeBtn = clone.querySelector('.remove-from-cart-btn');
            removeBtn.dataset.cartId = item.cartId;
            removeBtn.dataset.action = 'remove-from-cart';

            return clone;
        },

      
        getWishlistDropdownHtml() {
            const { wishlist } = ScarStore.state;
            let itemsHtml;

            if (wishlist.length === 0) {
                itemsHtml = `<div class="text-center text-slate-500 py-10 flex flex-col items-center gap-4"><i data-lucide="heart" class="w-16 h-16 text-slate-300"></i><p>قائمة المفضلة فارغة.</p></div>`;
            } else {
                itemsHtml = wishlist.map(productId => {
                    const product = ScarStore.state.productMap.get(productId);
                    if (!product) return '';
                    const imageUrl = (product.isBundle && product.images && product.images.length > 0) ? product.images[0] : product.heroImage || (product.isBundle ? ScarStore.state.productMap.get(product.items[0].productId)?.images[0] : product.images[0]);
                    return `
                        <div class="flex items-center gap-4 py-3 px-4 hover:bg-slate-50 transition-colors duration-150">
                            <a href="?product=${product.id}"><img src="${imageUrl}" class="w-16 h-16 rounded-md object-cover" onerror="this.onerror=null;this.src='https://placehold.co/100x100/e2e8f0/475569?text=SCAR';"></a>
                            <div class="flex-grow">
                                <a href="?product=${product.id}" class="font-bold text-sm">${product.name}</a>
                                <p class="text-sm font-semibold text-indigo-600">${product.basePrice} ${ScarStore.state.storeData.config.currency}</p>
                            </div>
                            <button class="remove-from-wishlist-btn text-slate-400 hover:text-red-500 p-1" data-id="${product.id}" title="إزالة من المفضلة">
                                <i data-lucide="trash-2" class="w-5 h-5 pointer-events-none"></i>
                            </button>
                        </div>
                    `;
                }).join('');
            }

            return `
                <div id="wishlist-dropdown" class="header-dropdown">
                    <div class="p-4 border-b flex justify-between items-center">
                        <h3 class="font-bold text-lg">قائمة المفضلة</h3>
                        ${wishlist.length > 0 ? `<button id="clear-wishlist-btn" class="text-sm text-red-500 hover:underline flex items-center gap-1.5"><i data-lucide="trash" class="w-4 h-4"></i>إفراغ القائمة</button>` : ''}
                    </div>
                    <div class="flex-grow overflow-y-auto custom-scrollbar">${itemsHtml}</div>
                    ${wishlist.length > 0 ? `
                    <div class="p-4 border-t bg-slate-50 flex justify-center">
                         <a href="?view=wishlist" id="show-wishlist-products-btn" class="primary-btn interactive-btn text-center block">عرض المفضلة في صفحة</a>
                    </div>
                    ` : ''}
                </div>
            `;
        },
        getProductCardHtml(product) {
            const template = document.getElementById('product-card-template');
            const clone = template.content.cloneNode(true);
            const card = clone.querySelector('.product-card');
            card.dataset.id = product.id;
            clone.querySelectorAll('.product-link').forEach(link => {
                link.href = `?product=${product.id}`;
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    ScarStore.Router.navigateTo(link.href, true);
                });
            });
            const imageContainer = clone.querySelector('.product-image-container');
            const imageEl = imageContainer.querySelector('.product-image');
            if (product.images && product.images.length > 0) {
                imageEl.src = product.images[0];
            } else if (product.isBundle) {
                imageContainer.innerHTML = this.getBundleImageGridHtml(product);
            }
            imageEl.alt = product.name;
            imageEl.onerror = function() { this.src='https://placehold.co/400x400/e2e8f0/475569?text=SCAR'; };
            const nameEl = clone.querySelector('.product-name');
            nameEl.textContent = product.name;
            const badgesContainer = clone.querySelector('.product-badges');
            if (product.isBundle) badgesContainer.innerHTML += `<span class="product-badge badge-bundle">عرض</span>`;
            if (product.isNew) badgesContainer.innerHTML += `<span class="product-badge badge-new">جديد</span>`;
            if (product.discountPercentage > 0 && !product.isBundle) badgesContainer.innerHTML += `<span class="product-badge badge-sale">${product.discountPercentage}%</span>`;
            if (product.isExclusive) badgesContainer.innerHTML += `<span class="product-badge badge-exclusive">حصري</span>`;
            if (product.bestSeller) badgesContainer.innerHTML += `<span class="product-badge" style="background-color: #f59e0b;">الأكثر مبيعاً</span>`;
            clone.querySelector('.love-btn').dataset.id = product.id;
            clone.querySelector('.stock-overlay').classList.toggle('hidden', product.stock > 0);
            clone.querySelector('.price-container').classList.toggle('out-of-stock', product.stock <= 0);
            return clone;
        },
        
        getBundleImageGridHtml(bundle) {
            const productImages = bundle.items.map(item => {
                const product = ScarStore.state.storeData.products.find(p => p.numericId === item.productId);
                return product ? product.images[0] : 'https://placehold.co/200x200/e2e8f0/475569?text=SCAR';
            }).slice(0, 9);
            const count = productImages.length;
            let gridClasses = 'grid gap-1 w-full h-full';
            let imagesHtml = '';
            const imgTag = (src, extraClass = '') => `<img src="${src}" class="w-full h-full object-cover ${extraClass}" loading="lazy" alt="${bundle.name} item" onerror="this.onerror=null;this.src='https://placehold.co/200x200/e2e8f0/475569?text=SCAR';">`;
            switch (count) {
                case 1: return imgTag(productImages[0]);
                case 2: gridClasses += ' grid-cols-2'; imagesHtml = productImages.map(src => imgTag(src)).join(''); break;
                case 3: gridClasses += ' grid-cols-2 grid-rows-2'; imagesHtml = imgTag(productImages[0], 'row-span-2') + imgTag(productImages[1]) + imgTag(productImages[2]); break;
                case 4: gridClasses += ' grid-cols-2 grid-rows-2'; imagesHtml = productImages.map(src => imgTag(src)).join(''); break;
                default: gridClasses += ' grid-cols-3 grid-rows-2'; imagesHtml = productImages.map(src => imgTag(src)).join(''); break;
            }
            return `<div class="${gridClasses}">${imagesHtml}</div>`;
        },
        
        getCardActionControlsHtml(product, cartItem = null) {
            const template = document.getElementById('card-action-controls-template');
            const clone = template.content.cloneNode(true);
            const minQty = product.minPurchase || 1;
            const qtyInput = clone.querySelector('.qty-input');
            const decreaseBtn = clone.querySelector('[data-action="decrease-qty"]');
            const increaseBtn = clone.querySelector('[data-action="increase-qty"]');
            const actionBtn = clone.querySelector('.add-to-cart-btn');
            
            qtyInput.value = cartItem ? cartItem.quantity : minQty;
            qtyInput.min = minQty;
            qtyInput.max = product.stock;
            
            if (cartItem) {
                actionBtn.innerHTML = `<i data-lucide="trash-2" class="w-5 h-5"></i>`;
                actionBtn.classList.replace('primary-btn', 'danger-btn');
                actionBtn.dataset.action = 'remove-from-cart';
                actionBtn.dataset.cartId = cartItem.cartId;
                decreaseBtn.dataset.action = 'decrease-cart-qty';
                increaseBtn.dataset.action = 'increase-cart-qty';
                decreaseBtn.dataset.cartId = cartItem.cartId;
                increaseBtn.dataset.cartId = cartItem.cartId;
            }
            return clone;
        },

        getBundleImageGridHtml(bundle) {
            const productImages = bundle.items.map(item => {
                const product = ScarStore.state.storeData.products.find(p => p.numericId === item.productId);
                return product ? product.images[0] : 'https://placehold.co/200x200/e2e8f0/475569?text=SCAR';
            }).slice(0, 9);
            const count = productImages.length;
            let gridClasses = 'grid gap-1 w-full h-full';
            let imagesHtml = '';
            const imgTag = (src, extraClass = '') => `<img src="${src}" class="w-full h-full object-cover ${extraClass}" loading="lazy" alt="${bundle.name} item" onerror="this.onerror=null;this.src='https://placehold.co/200x200/e2e8f0/475569?text=SCAR';">`;
            switch (count) {
                case 1: return imgTag(productImages[0]);
                case 2: gridClasses += ' grid-cols-2'; imagesHtml = productImages.map(src => imgTag(src)).join(''); break;
                case 3: gridClasses += ' grid-cols-2 grid-rows-2'; imagesHtml = imgTag(productImages[0], 'row-span-2') + imgTag(productImages[1]) + imgTag(productImages[2]); break;
                case 4: gridClasses += ' grid-cols-2 grid-rows-2'; imagesHtml = productImages.map(src => imgTag(src)).join(''); break;
                default: gridClasses += ' grid-cols-3 grid-rows-2'; imagesHtml = productImages.map(src => imgTag(src)).join(''); break;
            }
            return `<div class="${gridClasses}">${imagesHtml}</div>`;
        },
        
        getCardActionControlsHtml(product, cartItem = null) {
            const template = document.getElementById('card-action-controls-template');
            const clone = template.content.cloneNode(true);
            const minQty = product.minPurchase || 1;
            const qtyInput = clone.querySelector('.qty-input');
            const decreaseBtn = clone.querySelector('[data-action="decrease-qty"]');
            const increaseBtn = clone.querySelector('[data-action="increase-qty"]');
            const actionBtn = clone.querySelector('.add-to-cart-btn');
            
            qtyInput.value = cartItem ? cartItem.quantity : minQty;
            qtyInput.min = minQty;
            qtyInput.max = product.stock;
            
            if (cartItem) {
                actionBtn.innerHTML = `<i data-lucide="trash-2" class="w-5 h-5"></i>`;
                actionBtn.classList.replace('primary-btn', 'danger-btn');
                actionBtn.dataset.action = 'remove-from-cart';
                actionBtn.dataset.cartId = cartItem.cartId;
                decreaseBtn.dataset.action = 'decrease-cart-qty';
                increaseBtn.dataset.action = 'increase-cart-qty';
                decreaseBtn.dataset.cartId = cartItem.cartId;
                increaseBtn.dataset.cartId = cartItem.cartId;
            }
            return clone;
        },

        getVariantsHtml(product, isCard = false, selectedOptions = {}, cartId = null) {
            const { variants } = product;
            if (!variants) return '';

            const idPrefix = cartId ? cartId : product.id;
            let variantsHtml = '';

            const variantOrder = ['اللون', 'المقاس', 'الطول', 'موديل الهاتف'];
            
            const sortedVariantKeys = Object.keys(variants).sort((a, b) => {
                const indexA = variantOrder.indexOf(a);
                const indexB = variantOrder.indexOf(b);
                
                if (indexA === -1 && indexB === -1) return 0; 
                if (indexA === -1) return 1; 
                if (indexB === -1) return -1; 
                
                return indexA - indexB; 
            });

            sortedVariantKeys.forEach(key => {
                if (Object.hasOwnProperty.call(variants, key)) {
                    const options = variants[key];
                    const name = `option-${idPrefix}-${key}`;
                    let optionsHtml = '';
                    let finalHtmlWrapper = '';

                    if (key === 'اللون') {
                        optionsHtml = options.map((option, index) => {
                            const value = typeof option === 'object' ? option.value : option;
                            const nameAttr = typeof option === 'object' ? option.name || value : value;
                            const style = `background-color:${value}`;
                            let isChecked = (selectedOptions && selectedOptions[key] === value) || (!selectedOptions[key] && index === 0);
                            
                            return `
                                <label class="product-option-label cursor-pointer">
                                    <input type="radio" name="${name}" value="${value}" class="sr-only product-variant-selector" ${isChecked ? 'checked' : ''} data-product-id="${product.id}" data-variant-key="${key}">
                                    <span class="product-option-value color-swatch shadow-sm ${isCard ? '!w-6 !h-6' : 'w-8 h-8'} relative block rounded-full border-2 border-transparent" style="${style}" title="${nameAttr}"></span>
                                </label>`;
                        }).join('');

                        const labelHtml = isCard ? '' : `<label class="font-semibold text-sm w-24">${key} :</label>`;
                        finalHtmlWrapper = `<div class="flex items-center gap-4 mt-2">${labelHtml}<div class="flex flex-wrap items-center gap-2">${optionsHtml}</div></div>`;
                    
                    } else if (key === 'موديل الهاتف') {
                        optionsHtml = options.map(opt => `<option value="${opt.value}" ${selectedOptions[key] === opt.value ? 'selected' : ''}>${opt.value}</option>`).join('');
                        
                        const selectClasses = "variant-model-select product-variant-selector";
                        const selectHtml = `<select name="${name}" class="${selectClasses}" data-variant-key="${key}">${optionsHtml}</select>`;
                        
                        const labelHtml = isCard ? '' : `<label class="font-semibold text-sm w-24">${key} :</label>`;
                        const selectContainerClass = isCard ? '' : 'flex-grow min-w-0';

                        finalHtmlWrapper = `
                            <div class="flex items-center gap-4 mt-2">
                                ${labelHtml}
                                <div class="${selectContainerClass}">
                                    ${selectHtml}
                                </div>
                            </div>`;

                    } else {
                        optionsHtml = options.map((option, index) => {
                            const value = typeof option === 'object' ? option.value : option;
                            let isChecked = (selectedOptions && selectedOptions[key] === value) || (!selectedOptions[key] && index === 0);

                            return `
                                <label class="product-option-label cursor-pointer">
                                    <input type="radio" name="${name}" value="${value}" class="sr-only product-variant-selector" ${isChecked ? 'checked' : ''} data-product-id="${product.id}" data-variant-key="${key}">
                                    <span class="product-option-value-text">${value}</span>
                                </label>`;
                        }).join('');
                        
                        const labelHtml = isCard ? '' : `<label class="font-semibold text-sm w-24">${key} :</label>`;
                        finalHtmlWrapper = `<div class="flex items-center gap-4 mt-2">${labelHtml}<div class="flex flex-wrap items-center gap-2">${optionsHtml}</div></div>`;
                    }

                    variantsHtml += finalHtmlWrapper;
                }
            });
            
            return variantsHtml;
        },
        
        getBundleVariantsForCartHtml(bundle, cartId, selectedOptions = {}) {
            const container = document.createElement('div');
            container.className = 'space-y-2 mt-2';
            bundle.items.forEach(item => {
                const itemProduct = ScarStore.state.storeData.products.find(p => p.numericId === item.productId);
                if (itemProduct?.variants) {
                    const itemContainer = document.createElement('div');
                    itemContainer.className = 'text-xs';
                    itemContainer.innerHTML = `<p class="font-bold text-slate-600">${itemProduct.name}:</p>`;
                    const itemSelectedOptions = selectedOptions ? selectedOptions[itemProduct.id] : {};
                    itemContainer.innerHTML += this.getVariantsHtml(itemProduct, true, itemSelectedOptions, cartId);
                    container.appendChild(itemContainer);
                }
            });
            return container;
        },
        
        getCategoryHtml(cat, isSwiperSlide = false) {
            const wrapper = document.createElement('div');
            if (isSwiperSlide) {
                wrapper.className = 'swiper-slide';
            }
            const isAllProducts = cat.id === 'all-products';
            const hasImage = cat.backgroundImage && !isAllProducts;
            const cardClasses = isAllProducts ? 'card p-4 flex justify-center items-center aspect-square rounded-xl bg-white border-2 border-dashed border-slate-300 group-hover:border-indigo-500' : `card p-4 flex justify-center items-center aspect-square rounded-xl bg-white relative overflow-hidden bg-cover bg-center transition-transform duration-300 group-hover:scale-105`;
            const styleAttr = hasImage ? `style="background-image: url('${cat.backgroundImage}')"` : '';
            const overlayHtml = hasImage ? `<div class="absolute inset-0 bg-black bg-opacity-40 z-10"></div>` : '';
            const iconContainerClasses = hasImage ? 'relative z-20 text-white' : 'text-slate-500 group-hover:text-indigo-600 transition-colors';
            wrapper.innerHTML = `<a href="?category=${cat.id}" class="category-item-link group text-center cursor-pointer" data-id="${cat.id}"><div class="${cardClasses}" ${styleAttr}>${overlayHtml}<div class="${iconContainerClasses}"><i data-lucide="${cat.icon || 'package'}" class="w-12 h-12"></i></div></div><h3 class="mt-3 font-semibold text-slate-700">${cat.name}</h3></a>`;
            return wrapper;
        },
        
        getProductRowHtml(title, products, viewAllUrl) {
            const wrapper = document.createElement('div');
            const productsHtml = products.map(p => this.getProductCardHtml(p).firstElementChild.outerHTML).join('');
            wrapper.innerHTML = `<div class="flex justify-between items-center mb-6"><h2 class="text-3xl font-bold">${title}</h2><a href="${viewAllUrl}" class="text-indigo-600 font-bold hover:underline">عرض الكل</a></div><div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">${productsHtml}</div>`;
            return wrapper;
        },
        
        getSkeletonCardHtml() {
            return `<div class="skeleton-card animate-pulse"><div class="skeleton-image"></div><div class="p-4 space-y-3"><div class="skeleton-text w-3/4"></div><div class="skeleton-text w-1/2"></div><div class="flex justify-between items-center pt-4"><div class="skeleton-text w-1/4"></div><div class="skeleton-avatar"></div></div></div></div>`;
        },
        
        getErrorHtml(title, message) {
            const wrapper = document.createElement('div');
            wrapper.className = 'text-center py-16 text-red-500';
            wrapper.innerHTML = `<h2 class="text-2xl font-bold">${title}</h2><p>${message}</p>`;
            return wrapper;
        },
        
        getProductPageHtml(product) {
            const wrapper = document.createElement('div');
            if (product.isBundle) {
                wrapper.innerHTML = this.getBundlePageHtmlString(product);
                const bundleItemsContainer = wrapper.querySelector('#bundle-items-container');
                product.items.forEach(item => {
                    const itemProduct = ScarStore.state.storeData.products.find(p => p.numericId === item.productId);
                    if (itemProduct) {
                        bundleItemsContainer.appendChild(this.getBundleItemHtml(itemProduct, product.id));
                    }
                });
            } else {
                wrapper.innerHTML = this.getSingleProductPageHtmlString(product);
            }
            return wrapper;
        },
        
        getSingleProductPageHtmlString(product) {
            const { currency } = ScarStore.state.storeData.config;
            
            const imageSources = (product.media || product.images.map(src => ({type: 'image', src})))
                .filter(item => item.type === 'image');
            const mainImageSrc = imageSources.length > 0 ? imageSources[0].src : 'https://placehold.co/600x600/e2e8f0/475569?text=SCAR';
            
            const thumbnailsHtml = imageSources.map((img, index) => `
                <div class="p-1 rounded-lg cursor-pointer ${index === 0 ? 'ring-2 ring-indigo-500' : ''} border bg-white product-thumbnail-item" data-image-index="${index}">
                    <img src="${img.src}" alt="Thumbnail ${index + 1}" class="w-full h-full object-contain rounded-md pointer-events-none">
                </div>
            `).join('');
            
            let stockHtml;
            if (product.stock <= 0) {
                stockHtml = `<div class="stock-indicator out-of-stock inline-block">نفدت الكمية</div>`;
            } else if (product.stock <= ScarStore.state.storeData.config.lowStockThreshold) {
                stockHtml = `<div class="stock-indicator low-stock inline-block">⏳ متبقي ${product.stock} قطع فقط</div>`;
            } else {
                stockHtml = `<div class="stock-indicator bg-green-100 text-green-800 inline-block">متوفر (${product.stock} قطعة)</div>`;
            }
            
            let originalStatusHtml = '';
            if (product.isOriginal !== undefined) {
                originalStatusHtml = `
                    <span class="w-px h-4 bg-slate-300"></span>
                    <span class="flex items-center gap-1.5">
                        <i data-lucide="${product.isOriginal ? 'badge-check' : 'copy'}" class="w-4 h-4 ${product.isOriginal ? 'text-green-600' : 'text-amber-600'}"></i>
                        <span class="font-semibold ${product.isOriginal ? 'text-green-600' : 'text-amber-600'}">
                            ${product.isOriginal ? 'أصلي' : 'جودة عالية (كوبي)'}
                        </span>
                    </span>
                `;
            }
            
            return `<div><div class="mb-6"><button id="back-btn" class="flex items-center gap-2 text-slate-600 font-semibold hover:text-indigo-600 transition-colors"><i data-lucide="arrow-right"></i><span>العودة للخلف</span></button></div><div class="bg-white p-6 md:p-8 rounded-xl shadow-sm mb-8"><div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12"><div class="space-y-4">
        
            <div class="relative group aspect-square bg-slate-50 rounded-lg flex items-center justify-center">
                <img src="${mainImageSrc}" alt="${product.name}" class="main-product-img max-w-full max-h-full object-contain cursor-pointer" data-action="open-lightbox" onerror="this.onerror=null;this.src='https://placehold.co/600x600/e2e8f0/475569?text=SCAR';">
                <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none rounded-lg">
                    <i data-lucide="zoom-in" class="w-16 h-16 text-white"></i>
                </div>
            </div>
            <div class="grid grid-cols-5 gap-2">${thumbnailsHtml}</div></div><div class="space-y-6 flex flex-col"><div class="space-y-2"><div class="flex justify-between items-start"><h1 class="text-3xl md:text-4xl font-extrabold text-slate-800">${product.name}</h1><div class="flex items-center gap-2"><button class="love-btn p-2 bg-slate-100 rounded-full" data-id="${product.id}" aria-label="إضافة إلى المفضلة"><i data-lucide="heart" class="w-7 h-7 icon-heart pointer-events-none"></i></button><button id="share-product-btn" class="p-2 bg-slate-100 rounded-full" data-id="${product.id}" data-name="${product.name}" aria-label="مشاركة المنتج"><i data-lucide="share-2" class="w-7 h-7 text-slate-600 pointer-events-none"></i></button></div></div>
            
            <div class="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                <span>ID: <span class="font-semibold text-slate-700">${product.id}</span></span>
                <span class="w-px h-4 bg-slate-300"></span>
                <span>الماركة: <span class="font-semibold text-slate-700">${product.brand}</span></span>
                <span class="w-px h-4 bg-slate-300"></span>
                <span>الضمان: <span class="font-semibold text-slate-700">${product.warranty || 'لا يوجد'}</span></span>
                <span class="w-px h-4 bg-slate-300"></span>
                <span>بلد الصنع: <span class="font-semibold text-slate-700">${product.countryOfOrigin}</span></span>
                ${originalStatusHtml}
            </div>

            </div><div class="price-container flex items-baseline gap-3"><p class="product-price text-4xl font-extrabold text-indigo-600">${product.basePrice} ${currency}</p><p class="product-old-price text-xl text-slate-500 line-through ${product.oldPrice ? '' : 'hidden'}">${product.oldPrice} ${currency}</p></div><p class="text-slate-600 leading-relaxed flex-grow">${product.description}</p><div class="border-t pt-6 space-y-4"><div class="flex items-center gap-4">${stockHtml}</div><div class="variants-container"></div><div class="action-button-container" data-product-id="${product.id}"></div></div></div></div></div></div>`;
        },

        getBundlePageHtmlString(bundle) {
            const { currency } = ScarStore.state.storeData.config;
            let allMedia = (bundle.images && bundle.images.length > 0) ? bundle.images.map(src => ({ type: 'image', src })) : [];
            if (allMedia.length === 0) {
                bundle.items.forEach(item => {
                    const product = ScarStore.state.storeData.products.find(p => p.numericId === item.productId);
                    if (product) allMedia.push(...(product.media || product.images.map(src => ({ type: 'image', src }))));
                });
            }
            const mainImageSrc = allMedia[0]?.src || 'https://placehold.co/600x600/e2e8f0/475569?text=SCAR';
            const thumbnailsHtml = allMedia.map((media, index) => `<div class="p-1 rounded-lg cursor-pointer ${index === 0 ? 'ring-2 ring-indigo-500' : ''} border product-thumbnail-item" data-image-index="${index}"><img src="${media.src}" alt="Thumbnail ${index + 1}" class="w-full h-full object-cover rounded-md pointer-events-none" onerror="this.onerror=null;this.src='https://placehold.co/100x100/e2e8f0/475569?text=SCAR';"></div>`).join('');
            let stockHtml;
            if (bundle.stock <= 0) {
                stockHtml = `<div class="stock-indicator out-of-stock inline-block">نفدت الكمية</div>`;
            } else if (bundle.stock <= ScarStore.state.storeData.config.lowStockThreshold) {
                stockHtml = `<div class="stock-indicator low-stock inline-block">⏳ متبقي ${bundle.stock} قطع فقط</div>`;
            } else {
                stockHtml = `<div class="stock-indicator bg-green-100 text-green-800 inline-block">متوفر (${bundle.stock} قطعة)</div>`;
            }
            return `<div><div class="mb-6"><button id="back-btn" class="flex items-center gap-2 text-slate-600 font-semibold hover:text-indigo-600 transition-colors"><i data-lucide="arrow-right"></i><span>العودة للخلف</span></button></div><div class="space-y-8"><div class="bg-white p-6 md:p-8 rounded-xl shadow-sm"><div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12"><div class="space-y-4"><div class="relative group aspect-square"><img src="${mainImageSrc}" alt="${bundle.name}" class="main-product-img w-full h-full rounded-lg object-cover border cursor-pointer" data-action="open-lightbox" onerror="this.onerror=null;this.src='https://placehold.co/600x600/e2e8f0/475569?text=SCAR';"><div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"><i data-lucide="zoom-in" class="w-16 h-16 text-white"></i></div></div><div class="grid grid-cols-5 gap-2">${thumbnailsHtml}</div></div><div class="space-y-6 flex flex-col"><div class="space-y-2"><div class="flex justify-between items-start"><h1 class="text-3xl md:text-4xl font-extrabold text-slate-800">${bundle.name}</h1><div class="flex items-center gap-2"><button class="love-btn p-2 bg-slate-100 rounded-full" data-id="${bundle.id}"><i data-lucide="heart" class="w-7 h-7 icon-heart pointer-events-none"></i></button><button id="share-product-btn" class="p-2 bg-slate-100 rounded-full" data-id="${bundle.id}" data-name="${bundle.name}"><i data-lucide="share-2" class="w-7 h-7 text-slate-600 pointer-events-none"></i></button></div></div><div class="flex items-center gap-4 text-sm text-slate-500"><span class="product-badge badge-bundle">عرض</span><span>ID: <span class="font-semibold text-slate-700">${bundle.id}</span></span></div></div><div class="price-container flex items-baseline gap-3"><p class="product-price text-4xl font-extrabold text-indigo-600">${bundle.basePrice} ${currency}</p><p class="product-old-price text-xl text-slate-500 line-through">${bundle.oldPrice} ${currency}</p></div><p class="text-slate-600 leading-relaxed flex-grow">${bundle.description}</p><div class="border-t pt-6 space-y-4"><div class="flex items-center gap-4">${stockHtml}</div><div class="action-button-container" data-product-id="${bundle.id}"></div></div></div></div></div><div><h2 class="text-2xl font-bold mb-4">محتويات العرض</h2><div id="bundle-items-container" class="space-y-6"></div></div></div></div>`;
        },
        
        getBundleItemHtml(itemProduct, bundleId) {
            const wrapper = document.createElement('div');
            wrapper.className = 'bundle-item bg-white p-4 rounded-lg shadow-sm flex flex-col md:flex-row gap-4';
            wrapper.dataset.productId = itemProduct.id;
            const variantsHtml = itemProduct.variants ? this.getVariantsHtml(itemProduct, false, {}, bundleId) : '';
            wrapper.innerHTML = `<img src="${itemProduct.images[0]}" alt="${itemProduct.name}" class="w-full md:w-32 h-32 object-cover rounded-md flex-shrink-0" onerror="this.onerror=null;this.src='https://placehold.co/150x150/e2e8f0/475569?text=SCAR';"><div class="flex-grow"><a href="?product=${itemProduct.id}" class="font-bold text-lg text-indigo-600 hover:underline">${itemProduct.name}</a><p class="text-sm text-slate-500 mt-1">${itemProduct.description.substring(0, 100)}...</p>${variantsHtml}</div>`;
            return wrapper;
        },
  // استبدل الدالة القديمة بهذه النسخة المحدثة
getOrderSuccessModalHtml(orderId) {
    return `
        <div class="modal-content bg-white rounded-xl shadow-2xl w-full max-w-md p-6 text-center">
            <div class="success-animation mx-auto mb-4">
                <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/><path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/></svg>
            </div>
            <h2 class="text-2xl font-bold mt-4 mb-2">تم استلام طلبك بنجاح!</h2>
            <p class="text-slate-500 mb-6">
                طلبك في طريقه إليك. سنرسل لك رسالة تأكيد على واتساب قريباً.
                احتفظ بمعرّف الطلب لمتابعته معنا:
            </p>
            <div class="bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg p-3 flex items-center justify-between gap-4 mb-6">
                <span id="order-id-text" class="font-mono font-bold text-indigo-600 text-lg">${orderId}</span>
                <button id="copy-order-id-btn" data-order-id="${orderId}" class="secondary-btn !p-2" title="نسخ المعرف"><i data-lucide="copy" class="w-5 h-5"></i></button>
            </div>
            <div class="mt-4 space-y-2 text-xs text-slate-600 bg-slate-100 p-3 rounded-lg text-right">
                <p class="flex items-start gap-2">
                    <i data-lucide="shield-check" class="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"></i>
                    <span><strong>ضمان الاستلام:</strong> يمكنك استعادة أموالك بكل سهولة إذا لم تستلم طلبك.</span>
                </p>
                <p class="flex items-start gap-2">
                    <i data-lucide="package-open" class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"></i>
                    <span><strong>حق المعاينة:</strong> يمكنك فتح المنتج وتجربته عند الاستلام للتأكد من مطابقته لطلبك.</span>
                </p>
            </div>
            <button onclick="ScarStore.Modals.closeLast()" class="primary-btn w-full mt-6">حسناً</button>
        </div>
    `;
},
        getPhoneModalHtml() {
            return `<div class="modal-content bg-white rounded-xl shadow-2xl w-full max-w-sm"><div class="p-6 text-center"><h2 class="text-2xl font-bold mb-2">مرحباً بك في متجر SCAR!</h2><p class="text-slate-500 mb-4">نحتاج رقم هاتفك ليسهل علينا التواصل معك ومتابعة طلباتك.</p><form id="phone-form" novalidate><input type="tel" id="user-phone-input" class="form-input iti-input" required><p id="phone-error" class="text-red-500 text-sm mt-1 h-4"></p><button type="submit" class="primary-btn w-full mt-2">حفظ ومتابعة</button></form></div></div>`;
        },
        
        getNameModalHtml() {
            return `<div class="modal-content bg-white rounded-xl shadow-2xl w-full max-w-sm"><div class="p-6 text-center"><h2 class="text-2xl font-bold mb-2">اسمك الكريم؟</h2><p class="text-slate-500 mb-4">نريد معرفة اسمك لتحسين تجربتك وتسهيل عملية الطلب لاحقًا.</p><form id="name-form"><input type="text" id="user-name-input" class="form-input text-center" placeholder="الاسم الكامل" required><button type="submit" class="primary-btn w-full mt-4">حفظ الاسم</button></form></div></div>`;
        },

        getMobilePageHtml(type) {
            const isCart = type === 'cart';
            const sourceTemplateHtml = isCart ? this.getCartDropdownHtml() : this.getWishlistDropdownHtml();

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = sourceTemplateHtml;
            const sourceNode = tempDiv.querySelector('.header-dropdown');

            const headerContent = sourceNode.querySelector('.p-4.border-b')?.innerHTML || `<h3>${isCart ? 'السلة' : 'المفضلة'}</h3>`;
            const bodyContent = sourceNode.querySelector('#cart-dropdown-items')?.innerHTML || sourceNode.querySelector('.flex-grow.overflow-y-auto')?.innerHTML || '<div class="text-center py-10 text-slate-500">فارغ</div>';
            const footerContent = sourceNode.querySelector('.p-4.border-t')?.outerHTML || '';

            return `
                <div id="${type}-mobile-modal" class="modal-content mobile-modal-page">
                    <header class="mobile-modal-header p-4">
                        <div class="flex-grow">${headerContent}</div>
                        <button class="close-modal-btn"><i data-lucide="x" class="w-6 h-6"></i></button>
                    </header>
                    <div class="mobile-modal-body custom-scrollbar p-4 space-y-4">
                        ${bodyContent}
                    </div>
                    <footer class="mobile-modal-footer">
                        ${footerContent}
                    </footer>
                </div>
            `;
        },

        getOrderTrackingModalHtml() {
            const template = document.getElementById('order-tracking-modal-template');
            const clone = template.content.cloneNode(true);
            const pastOrdersList = clone.getElementById('past-orders-list');
            const storageVersion = ScarStore.state.storeData.config.storageVersion || 'v-fallback';
            const pastOrders = JSON.parse(localStorage.getItem(`scarOrders_${storageVersion}`) || '[]');

            if (pastOrders.length > 0) {
                pastOrders.reverse().slice(0, 5).forEach(order => {
                    const orderDiv = document.createElement('div');
                    orderDiv.className = 'past-order-item flex justify-between items-center p-2 rounded-md cursor-pointer hover:bg-indigo-100 transition-colors text-sm';
                    orderDiv.dataset.orderId = order.id;
                    orderDiv.innerHTML = `
                        <span class="font-mono font-semibold text-slate-800">${order.id}</span>
                        <span class="text-xs text-slate-500">${new Date(order.date).toLocaleDateString('ar-EG')}</span>
                    `;
                    pastOrdersList.appendChild(orderDiv);
                });
            } else {
                pastOrdersList.innerHTML = `<p class="text-center text-xs text-slate-500 p-4">لا توجد طلبات سابقة محفوظة على هذا المتصفح.</p>`;
            }
            return clone;
        },

    
// استبدل الدالة القديمة في ملف modules.js بهذه النسخة الكاملة والنهائية
getOrderStatusModalHtml(statusData) {
    const template = document.getElementById('order-status-modal-template');
    if (!template) return document.createDocumentFragment();

    const clone = template.content.cloneNode(true);
    const header = clone.getElementById('order-status-header');
    const body = clone.getElementById('order-status-body');
    const footer = clone.getElementById('order-status-footer');
    const { config } = ScarStore.state.storeData;

    // --- 1. التحقق من حالة التحقق (هل أدخل المستخدم رقم هاتفه؟) ---
    const { orderVerification } = ScarStore.state;
    const isVerified = orderVerification.isVerified && orderVerification.orderId === statusData.id;

    // --- 2. تحليل الحالة وتجهيز متغيرات العرض ---
    const stages = [
        { label: 'قيد المراجعة', icon: 'clipboard-list' },
        { label: 'جاري التجهيز', icon: 'package-plus' },
        { label: 'جاري التوصيل', icon: 'truck' },
        { label: 'تم التسليم', icon: 'check-circle-2' }
    ];
    const currentStatus = String(statusData.status || 'قيد المراجعة').trim();
    const isSpecialStatus = currentStatus.includes('ملغي') || currentStatus.includes('مؤجل');
    let currentIndex = stages.findIndex(stage => currentStatus.includes(stage.label));
    if (currentIndex === -1 && !isSpecialStatus) currentIndex = 0;
    
    let icon = 'package-search', headerClass = 'header-review';
    if (isSpecialStatus) {
        headerClass = currentStatus.includes('ملغي') ? 'header-cancelled' : 'header-hold';
        icon = currentStatus.includes('ملغي') ? 'x-circle' : 'pause-circle';
    } else {
        headerClass = ['header-review', 'header-processing', 'header-shipping', 'header-delivered'][currentIndex];
    }
    const formattedOrderDate = new Date(statusData.date || Date.now()).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const formattedLastModified = new Date(statusData.lastModified || Date.now()).toLocaleString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    // --- 3. بناء أجزاء الواجهة ---
    header.className = `modal-header ${headerClass}`;
    header.innerHTML = `<h3>طلب رقم: <span>${statusData.id || 'N/A'}</span></h3>`;

    // ===== بداية الجزء الذي تم إصلاحه =====
    // هذا الجزء يقوم بإنشاء المتغير statusDisplayHtml بشكل صحيح
    let statusDisplayHtml;
    if (isSpecialStatus) {
        statusDisplayHtml = `<div class="special-status-view"><i data-lucide="${icon}" class="w-16 h-16 mx-auto text-slate-500"></i><h4 class="font-bold text-slate-800 text-2xl mt-4">${currentStatus}</h4></div>`;
    } else {
        const progressPercentage = currentIndex > 0 ? (currentIndex / (stages.length - 1)) * 100 : 0;
        statusDisplayHtml = `<div class="status-stepper"><div class="line line-bg"></div><div class="line line-progress" style="width: ${progressPercentage}%;"></div>${stages.map((stage, index) => { let statusClass = (index < currentIndex) ? 'completed' : (index === currentIndex ? 'active' : ''); return `<div class="step-item ${statusClass}" style="--i:${index}"><div class="step-circle"><i data-lucide="${stage.icon}" class="step-icon"></i></div><p class="step-label">${stage.label}</p></div>`; }).join('')}</div>`;
    }
    // ===== نهاية الجزء الذي تم إصلاحه =====

    const adminMessageHtml = statusData.text ? `<div class="admin-message"><p><strong>ملاحظة من المتجر:</strong> ${statusData.text}</p></div>` : '';
    const lastDigitHint = String(statusData.phone || '').slice(-1);

    const verificationFormHtml = `
        <div id="verification-gate" class="my-6 p-4 bg-amber-50 border-2 border-dashed border-amber-300 rounded-lg text-center">
            <h5 class="font-bold text-amber-800 flex items-center justify-center gap-2"><i data-lucide="shield-check" class="w-5 h-5"></i> للحفاظ على خصوصيتك، يرجى تأكيد هويتك</h5>
            <p class="text-sm text-amber-700 mt-1 mb-3">أدخل آخر 6 أرقام من رقم الهاتف الذي ينتهي بـ (<strong>***${lastDigitHint}</strong>) لعرض كل التفاصيل.</p>
            <form id="order-verify-form" onsubmit="return false;">
                <div class="flex items-center justify-center gap-2">
                    <input type="tel" name="phone_verify" class="form-input text-center font-mono w-40" placeholder="XXXXXX" maxlength="6" pattern="[0-9]*" inputmode="numeric" required>
                    <button type="submit" class="primary-btn !py-2">تأكيد</button>
                </div>
            </form>
        </div>`;

    const unmaskedName = statusData.name || "غير متوفر";
    const maskedName = unmaskedName.substring(0, 3) + '***';
    const unmaskedPhone = statusData.phone || "غير متوفر";
    const maskedPhone = '*******' + String(unmaskedPhone).slice(-4);
    const unmaskedAddress = `${statusData.governorate || ''}, ${statusData.district || ''}, ${statusData.address || 'غير متوفر'}`;
    const maskedAddress = unmaskedAddress.length > 10 ? unmaskedAddress.substring(0, 10) + '...' : unmaskedAddress;
    const locationLinkHtml = statusData.location_link ? `<a href="${statusData.location_link}" target="_blank" class="text-indigo-600 underline font-semibold">فتح الموقع</a>` : "لم يحدد";
    const totalPrice = parseFloat(statusData.totalPrice) || 0;
    const shippingCost = parseFloat(statusData.shippingCost) || 0;
    const subtotal = totalPrice - shippingCost;

    const detailsGridHtml = `
        <div class="details-grid">
            <div class="detail-card">
                <div class="detail-card__header"><i data-lucide="user-round"></i><span>بيانات العميل</span></div>
                <div class="detail-card__body">
                    <p><span>الاسم:</span> <strong class="masked-data" data-unmasked="${unmaskedName}">${isVerified ? unmaskedName : maskedName}</strong></p>
                    <p><span>الهاتف:</span> <strong class="masked-data" data-unmasked='<span dir="ltr">${unmaskedPhone}</span>' dir="ltr">${isVerified ? unmaskedPhone : maskedPhone}</strong></p>
                </div>
            </div>
            <div class="detail-card">
                <div class="detail-card__header"><i data-lucide="map-pin"></i><span>بيانات الشحن</span></div>
                <div class="detail-card__body">
                    <p><span>العنوان:</span> <strong class="masked-data" data-unmasked="${unmaskedAddress}">${isVerified ? unmaskedAddress : maskedAddress}</strong></p>
                    <p><span>رابط الموقع:</span> <strong class="masked-data" data-unmasked='${locationLinkHtml}'>${isVerified ? locationLinkHtml : "محمي"}</strong></p>
                </div>
            </div>
            <div class="detail-card">
                <div class="detail-card__header"><i data-lucide="info"></i><span>معلومات الطلب</span></div>
                <div class="detail-card__body">
                    <p><span>تاريخ الطلب:</span> <strong>${formattedOrderDate}</strong></p>
                    <p><span>آخر تحديث:</span> <strong>${formattedLastModified}</strong></p>
                    <p><span>طريقة الشحن:</span> <strong>${statusData.shipping || 'غير محدد'}</strong></p>
                </div>
            </div>
            <div class="detail-card invoice-card">
                <div class="detail-card__header"><i data-lucide="receipt"></i><span>الفاتورة</span></div>
                <div class="detail-card__body">
                     <p><span>طريقة الدفع:</span> <strong>${statusData.paymentMethod || 'غير محدد'}</strong></p>
                    <p><span>قيمة المنتجات:</span> <strong>${subtotal.toFixed(2)} ${config.currency}</strong></p>
                    <p><span>قيمة الشحن:</span> <strong>${shippingCost.toFixed(2)} ${config.currency}</strong></p>
                    <p class="total"><span>الإجمالي:</span> <strong>${totalPrice.toFixed(2)} ${config.currency}</strong></p>
                </div>
            </div>
        </div>
    `;
    
    body.innerHTML = statusDisplayHtml + adminMessageHtml + (isVerified ? '' : verificationFormHtml) + detailsGridHtml;

    footer.innerHTML = `
        <a href="https://wa.me/${config.whatsappNumber}?text=مرحباً،%20أود%20الاستفسار%20عن%20طلبي%20رقم%20${statusData.id || ''}" target="_blank" class="secondary-btn inline-flex items-center gap-2 !py-2 text-sm">
            <i data-lucide="message-square" class="w-5 h-5"></i>
            <span>تواصل مع خدمة العملاء بخصوص هذا الطلب</span>
        </a>
    `;

    return clone;
},
        getOrderNotFoundModalHtml(orderId) {
            const template = document.getElementById('order-status-modal-template');
            const clone = template.content.cloneNode(true);
            const display = clone.getElementById('status-display');
            
            display.innerHTML = `
                <div class="text-center py-4">
                    <i data-lucide="search-x" class="w-16 h-16 mx-auto text-red-500"></i>
                    <h3 class="text-2xl font-bold mt-3">الطلب غير موجود</h3>
                </div>
                <div class="bg-red-50 border-r-4 border-red-500 p-4 rounded-lg text-slate-700">
                    <p>عذرًا، لم نتمكن من العثور على طلب بالمعرّف التالي:</p>
                    <p class="font-mono font-bold text-lg my-2 text-center bg-white py-2 rounded">${orderId}</p>
                    <p>يرجى التأكد من كتابة المعرّف بشكل صحيح أو <a href="https://wa.me/${ScarStore.state.storeData.config.whatsappNumber}" target="_blank" class="font-bold text-indigo-600 hover:underline">التواصل مع الدعم</a> للمساعدة.</p>
                </div>
            `;
            return clone;
        },
    },

    Cart: {
        generateCartItemId(productId, options) {
            if (!options || Object.keys(options).length === 0) return productId;
            const sortedOptions = Object.keys(options).sort().map(key => {
                if (key === 'موديل الهاتف' && typeof options[key] === 'object') {
                    return `${key}-` + Object.entries(options[key]).map(([model, qty]) => `${model}:${qty}`).join(',');
                }
                return `${key}-${options[key]}`;
            }).join('_');
            return `${productId}_${sortedOptions}`;
        },
        add(productId, quantity, options) {
            const product = ScarStore.state.productMap.get(productId);
            if (!product) return;
            
            const cartItemId = this.generateCartItemId(productId, options);
            let cartItem = ScarStore.state.cart.find(item => item.cartId === cartItemId);
            
            if (cartItem) {
                cartItem.quantity = Math.min(product.stock, cartItem.quantity + quantity);
            } else {
                ScarStore.state.cart.push({ 
                    cartId: cartItemId, 
                    id: productId, 
                    quantity: quantity, 
                    options,
                    price: ScarStore.StoreLogic.calculateCurrentPrice(product, options)
                });
            }
            
            this.save();
            this.updateUI();
            ScarStore.UI.syncProductCardViews(productId);
            ScarStore.Toast.show('تمت الإضافة إلى السلة بنجاح!', 'success');
        },
        updateQuantity(cartItemId, quantityChange) {
            const itemIndex = ScarStore.state.cart.findIndex(item => item.cartId === cartItemId);
            if (itemIndex === -1) return;

            const cartItem = ScarStore.state.cart[itemIndex];
            const product = ScarStore.state.productMap.get(cartItem.id);
            if (!product) return;

            const newQuantity = cartItem.quantity + quantityChange;
            if (newQuantity < 1) {
                this.remove(cartItemId);
            } else {
                cartItem.quantity = Math.min(newQuantity, product.stock);
                this.save();
                this.updateUI();
                ScarStore.UI.syncProductCardViews(product.id);
            }
        },
        changeVariant(cartItemId, productId, variantKey, newVariantValue) {
            const itemIndex = ScarStore.state.cart.findIndex(item => item.cartId === cartItemId);
            if (itemIndex === -1) return;

            const currentItem = ScarStore.state.cart[itemIndex];
            const product = ScarStore.state.productMap.get(productId);

            const newOptions = { ...currentItem.options, [variantKey]: newVariantValue };
            const newCartId = this.generateCartItemId(productId, newOptions);

            const existingDuplicateIndex = ScarStore.state.cart.findIndex(item => item.cartId === newCartId);

            if (existingDuplicateIndex > -1 && existingDuplicateIndex !== itemIndex) {
                ScarStore.state.cart[existingDuplicateIndex].quantity += currentItem.quantity;
                ScarStore.state.cart.splice(itemIndex, 1);
                ScarStore.Toast.show('تم دمج الكمية مع المنتج الموجود مسبقاً في السلة', 'info');
            } else {
                currentItem.options = newOptions;
                currentItem.cartId = newCartId;
                currentItem.price = ScarStore.StoreLogic.calculateCurrentPrice(product, newOptions);
            }

            this.save();
            this.updateUI();
            ScarStore.UI.syncProductCardViews(productId);
        },
        remove(cartItemId) {
            let productId = null;
            ScarStore.state.cart = ScarStore.state.cart.filter(item => {
                if (item.cartId === cartItemId) {
                    productId = item.id;
                    return false;
                }
                return true;
            });
            this.save();
            this.updateUI();
            if (productId) ScarStore.UI.syncProductCardViews(productId);
            ScarStore.Toast.show('تمت إزالة المنتج من السلة', 'danger');
        },
        clear() {
            const productIdsInCart = [...new Set(ScarStore.state.cart.map(item => item.id))];
            ScarStore.state.cart = [];
            this.save();
            this.updateUI();
            productIdsInCart.forEach(id => ScarStore.UI.syncProductCardViews(id));
        },
        save() {
             localStorage.setItem(`scarCart_${ScarStore.state.storeData.config.storageVersion}`, JSON.stringify(ScarStore.state.cart));
        },
        updateUI() {
            this.updateCountAndTotal();
            this.updateDropdownUI();
            ScarStore.Modals.updateMobilePage('cart');
        },
        updateCountAndTotal() {
            const { cartButton, mobileCartButton, cartTotalPrice } = ScarStore.DOMElements;
            const count = ScarStore.state.cart.reduce((sum, item) => sum + item.quantity, 0);
            const total = ScarStore.state.cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            
            const countEl = cartButton.querySelector('#cart-count');
            countEl.textContent = count;
            countEl.classList.toggle('hidden', count === 0);

            const mobileCountEl = mobileCartButton.querySelector('#mobile-cart-count');
            if(mobileCountEl) {
                mobileCountEl.textContent = count;
                mobileCountEl.classList.toggle('hidden', count === 0);
            }
            
            cartTotalPrice.textContent = `${total.toFixed(2)} ${ScarStore.state.storeData.config.currency}`;
            cartTotalPrice.classList.toggle('hidden', total === 0);
        },
        updateDropdownUI() {
            const dropdown = document.getElementById('cart-dropdown');
            if (dropdown) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = ScarStore.Templates.getCartDropdownHtml();
                dropdown.innerHTML = tempDiv.firstElementChild.innerHTML;
                lucide.createIcons();
            }
        }
    },

    Wishlist: {
        toggle(productId, callback) {
            const index = ScarStore.state.wishlist.indexOf(productId);
            if (index > -1) {
                ScarStore.state.wishlist.splice(index, 1);
            } else {
                ScarStore.state.wishlist.push(productId);
            }
            this.save();
            this.updateUI();
            ScarStore.UI.syncProductCardViews(productId);
            if (callback) callback();
        },
        clear() {
            const productIdsInWishlist = [...new Set(ScarStore.state.wishlist)];
            ScarStore.state.wishlist = [];
            this.save();
            this.updateUI();
            productIdsInWishlist.forEach(id => ScarStore.UI.syncProductCardViews(id));
        },
        save() {
            localStorage.setItem(`scarWishlist_${ScarStore.state.storeData.config.storageVersion}`, JSON.stringify(ScarStore.state.wishlist));
        },
        updateUI() {
            this.updateCount();
            this.updateDropdownUI();
            ScarStore.Modals.updateMobilePage('wishlist');
        },
        updateCount() {
            const { wishlistButton, mobileWishlistButton } = ScarStore.DOMElements;
            const count = ScarStore.state.wishlist.length;
            const countEl = wishlistButton.querySelector('#wishlist-count');
            countEl.textContent = count;
            countEl.classList.toggle('hidden', count === 0);
            const mobileCountEl = mobileWishlistButton.querySelector('#mobile-wishlist-count');
            if(mobileCountEl) {
                mobileCountEl.textContent = count;
                mobileCountEl.classList.toggle('hidden', count === 0);
            }
        },
        updateDropdownUI() {
            const dropdown = document.getElementById('wishlist-dropdown');
            if (dropdown) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = ScarStore.Templates.getWishlistDropdownHtml();
                dropdown.innerHTML = tempDiv.firstElementChild.innerHTML;
                lucide.createIcons();
            }
        }
    },

    Modals: {
        replaceContent(newContentHtml) {
            const overlay = document.getElementById('the-one-overlay');
            if (!overlay || !overlay.classList.contains('is-visible')) {
                this.show(newContentHtml);
                return;
            }
            const oldContent = overlay.querySelector('.modal-content');

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newContentHtml;
            const newContent = tempDiv.firstElementChild;

            gsap.to(oldContent, {
                scale: 0.9, autoAlpha: 0, duration: 0.2, ease: 'power2.in',
                onComplete: () => {
                    oldContent.remove();
                    overlay.appendChild(newContent);
                    gsap.fromTo(newContent,
                        { scale: 0.9, autoAlpha: 0 },
                        { scale: 1, autoAlpha: 1, duration: 0.3, ease: 'power2.out' }
                    );
                    lucide.createIcons();

                    const copyBtn = newContent.querySelector('#copy-order-id-btn');
                    if (copyBtn) {
                        copyBtn.addEventListener('click', () => {
                            const orderId = copyBtn.dataset.orderId;
                            if (!orderId) return;

                            navigator.clipboard.writeText(orderId).then(() => {
                                ScarStore.Toast.show('تم نسخ معرّف الطلب!', 'success');
                                
                                const icon = copyBtn.querySelector('i');
                                if (icon) {
                                    icon.setAttribute('data-lucide', 'check');
                                    lucide.createIcons();
                                    setTimeout(() => {
                                        icon.setAttribute('data-lucide', 'copy');
                                        lucide.createIcons();
                                    }, 2000);
                                }
                            }).catch(err => {
                                console.error('فشل النسخ: ', err);
                                ScarStore.Toast.show('فشل النسخ', 'danger');
                            });
                        });
                    }
                }
            });
        },
        show(contentHtml, closeOnOverlayClick = true) {
            const overlay = document.getElementById('the-one-overlay');
            if (!overlay) return console.error("Overlay not found!");

            overlay.innerHTML = contentHtml;
            overlay.dataset.closeable = closeOnOverlayClick;
            overlay.classList.add('is-visible');

            const modalContent = overlay.querySelector('.modal-content');
            if (modalContent) {
                if (!modalContent.classList.contains('mobile-modal-page')) {
                    gsap.fromTo(modalContent, { scale: 0.9, y: -20 }, { scale: 1, y: 0, duration: 0.3, ease: 'power2.out' });
                }
            }
        },
        close(modalContent) {
            const overlay = document.getElementById('the-one-overlay');
            if (!overlay) return;

            const content = modalContent || overlay.querySelector('.modal-content');

            if (content && content.classList.contains('mobile-modal-page')) {
                content.classList.remove('is-open');
            }

            overlay.classList.remove('is-visible');

            setTimeout(() => {
                overlay.innerHTML = '';
            }, 350);
        },
        closeLast() {
            this.close();
        },
        showMobilePage(type) {
            const mobilePageHtml = ScarStore.Templates.getMobilePageHtml(type);
            const overlay = document.getElementById('the-one-overlay');
            if (!overlay) return;

            overlay.innerHTML = mobilePageHtml;
            overlay.classList.add('is-visible');

            const modalContent = overlay.querySelector('.modal-content');
            const closeButton = overlay.querySelector('.close-modal-btn');

            if (closeButton && modalContent) {
                closeButton.addEventListener('click', () => this.close(modalContent));
            }

            lucide.createIcons();

            setTimeout(() => {
                if (modalContent) modalContent.classList.add('is-open');
            }, 10);
        },
        updateMobilePage(type) {
            const overlay = document.getElementById('the-one-overlay');
            const modal = overlay.querySelector(`#${type}-mobile-modal`);
            
            if (!overlay.classList.contains('is-visible') || !modal) {
                return;
            }

            const isCart = type === 'cart';
            const sourceTemplateHtml = isCart ? ScarStore.Templates.getCartDropdownHtml() : ScarStore.Templates.getWishlistDropdownHtml();
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = sourceTemplateHtml;
            const sourceNode = tempDiv.querySelector('.header-dropdown');

            const header = modal.querySelector('.mobile-modal-header .flex-grow');
            const body = modal.querySelector('.mobile-modal-body');
            const footer = modal.querySelector('.mobile-modal-footer');

            const newHeaderContent = sourceNode.querySelector('.p-4.border-b');
            const newBodyContent = sourceNode.querySelector('#cart-dropdown-items') || sourceNode.querySelector('.flex-grow.overflow-y-auto');
            const newFooterContent = sourceNode.querySelector('.p-4.border-t');

            if (header && newHeaderContent) header.innerHTML = newHeaderContent.innerHTML;
            if (body && newBodyContent) body.innerHTML = newBodyContent.innerHTML;
            if (footer) {
                footer.innerHTML = newFooterContent ? newFooterContent.outerHTML : '';
            }
            
            lucide.createIcons();
        },
// هذه الدالة تنتمي إلى الكائن ScarStore.Modals
handleCheckout() {
    // 1. التأكد من أن السلة ليست فارغة قبل فتح النافذة
    if (ScarStore.state.cart.length === 0) {
        ScarStore.Toast.show('سلة المشتريات فارغة!', 'danger');
        return;
    }

    // 2. جلب قالب النافذة من ملف HTML والتحقق من وجوده
    const template = document.getElementById('checkout-modal-template');
    if (!template) {
        console.error('Checkout modal template not found!');
        ScarStore.Toast.show('خطأ: لم يتم العثور على نموذج الطلب.', 'danger');
        return;
    }
    
    // 3. تحضير محتوى النافذة في حاوية مؤقتة
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(template.content.cloneNode(true));

    // 4. الحصول على البيانات اللازمة من الحالة العامة للمتجر
    const { cart, productMap, storeData: { config }, userInfo } = ScarStore.state;
    const { currency, shippingOptions, governoratesData } = config;
    
    // 5. ملء قسم "ملخص الطلب" بالمنتجات الموجودة في السلة
    const itemsContainer = tempDiv.querySelector('#checkout-items-summary');
    if (itemsContainer && cart.length > 0) {
        const itemFragments = cart.map(item => {
            const product = productMap.get(item.id);
            if (!product) return null;

            const itemDiv = document.createElement('div');
            itemDiv.className = 'py-3';

            let productInfoHtml = `<div class="flex items-start gap-4">
                <img src="${product.heroImage || (product.images ? product.images[0] : 'https://placehold.co/100x100/e2e8f0/475569?text=SCAR')}" class="w-16 h-16 rounded-md object-cover flex-shrink-0" onerror="this.src='https://placehold.co/100x100/e2e8f0/475569?text=SCAR';">
                <div class="flex-grow">
                    <p class="font-bold text-slate-800">${product.name}</p>`;
            
            if (item.options && Object.keys(item.options).length > 0) {
                const optionsHtml = Object.entries(item.options).map(([key, value]) => {
                    if (key === 'اللون' && product.variants && product.variants['اللون']) {
                        const colorVariant = product.variants['اللون'].find(v => (typeof v === 'object' ? v.value : v) === value);
                        const colorName = colorVariant && colorVariant.name ? colorVariant.name : value;
                        return `<div class="flex items-center gap-1.5"><span class="font-semibold">${key}:</span><span class="block w-3 h-3 rounded-full border" style="background-color: ${value};"></span><span>${colorName}</span></div>`;
                    }
                    if (key === 'موديل الهاتف' && typeof value === 'object') {
                        return `<div><span class="font-semibold">الموديلات:</span> ${Object.keys(value).join(', ')}</div>`;
                    }
                    return `<div><span class="font-semibold">${key}:</span> ${value}</div>`;
                }).join('');
                productInfoHtml += `<div class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">${optionsHtml}</div>`;
            }
            productInfoHtml += `</div></div>`;

            const itemPrice = item.price;
            const itemTotal = item.price * item.quantity;
            const priceHtml = `<div class="text-sm text-slate-600 mt-2 flex justify-end items-center gap-2 font-mono">
                <span>(${itemPrice.toFixed(2)} ${currency})</span>
                <span>x</span> <span class="font-bold">${item.quantity}</span>
                <span>=</span> <span class="font-bold text-base text-slate-800">${itemTotal.toFixed(2)} ${currency}</span>
            </div>`;

            itemDiv.innerHTML = productInfoHtml + priceHtml;
            return itemDiv;
        }).filter(Boolean);
        
        itemsContainer.append(...itemFragments);
    }
    
    // 6. ملء خيارات الشحن
    const shippingContainer = tempDiv.querySelector('#shipping-options-container');
    if (shippingContainer && shippingOptions) {
        const allShippingOptions = [...shippingOptions, { name: "الاستلام من الفرع", cost: 0, description: "استلم طلبك بنفسك من مقرنا." }];
        shippingContainer.innerHTML = allShippingOptions.map((opt, index) => 
            `<label class="flex items-start p-3 border rounded-lg cursor-pointer hover:border-indigo-500 transition-colors has-[:checked]:bg-indigo-50 has-[:checked]:border-indigo-500">
                <input type="radio" name="shipping" value="${opt.name}" data-cost="${opt.cost}" class="form-radio mt-1" ${index === 0 ? 'checked' : ''}>
                <div class="flex-grow mx-3">
                    <span class="font-semibold block">${opt.name}</span>
                    ${opt.description ? `<span class="text-xs text-slate-500">${opt.description}</span>` : ''}
                </div>
                <span class="font-bold text-sm">${opt.cost > 0 ? `${opt.cost.toFixed(2)} ${currency}` : 'مجاني'}</span>
            </label>`
        ).join('');
    }

    // 7. تعبئة بيانات العميل المحفوظة تلقائياً (قبل عرض النافذة)
    tempDiv.querySelector('#customer-name').value = userInfo.name || '';
    tempDiv.querySelector('#customer-address').value = userInfo.address || '';
    const notesField = tempDiv.querySelector('#customer-notes');
    if (notesField) {
      notesField.value = userInfo.notes || '';
    }

    const govSelect = tempDiv.querySelector('#customer-governorate');
    if (govSelect && governoratesData) {
        const govOptionsHtml = Object.keys(governoratesData).map(gov => 
            `<option value="${gov}" ${userInfo.governorate === gov ? 'selected' : ''}>${gov}</option>`
        ).join('');
        govSelect.innerHTML += govOptionsHtml;
    }

    // 8. عرض النافذة للمستخدم
    this.show(tempDiv.innerHTML);

    // 9. تنفيذ الأكواد التي تعتمد على ظهور النافذة في الصفحة (Post-Render)
    const displayedGovSelect = document.getElementById('customer-governorate');
    if (displayedGovSelect && userInfo.governorate) {
        ScarStore.Events.handleGovernorateChange(displayedGovSelect);
        setTimeout(() => {
            const districtSelect = document.getElementById('customer-district');
            if (districtSelect && userInfo.district) {
                districtSelect.value = userInfo.district;
            }
        }, 100);
    }
    
    this.initIntlTelInput('#customer-phone');
    this.initIntlTelInput('#customer-phone-secondary');
    
    const itiPrimary = ScarStore.state.phoneInputInstances['customer-phone'];
    if (itiPrimary && userInfo.phone) itiPrimary.setNumber(userInfo.phone);
    
    const itiSecondary = ScarStore.state.phoneInputInstances['customer-phone-secondary'];
    if (itiSecondary && userInfo.phone_secondary) itiSecondary.setNumber(userInfo.phone_secondary);

    // تفعيل نظام الدفع الجديد
  // ... داخل دالة handleCheckout، بعد سطر this.show(tempDiv.innerHTML);
const paymentContainer = document.getElementById('payment-options-container');
if (paymentContainer) {
    ScarStore.Payment.renderOptions(paymentContainer);
}
    // تحديث ملخص السعر النهائي وتفعيل الأيقونات
    ScarStore.Events.updateCheckoutSummary();
    lucide.createIcons();
},

        initIntlTelInput(selector) {
            const input = document.querySelector(selector);
            if (input && window.intlTelInput) {
                const iti = window.intlTelInput(input, {
                    initialCountry: "eg",
                    separateDialCode: true,
                    utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.13/js/utils.js",
                });
                ScarStore.state.phoneInputInstances[input.id] = iti;
            }
        },
        showConfirmation(title, message, onConfirm) {
            const template = document.getElementById('confirmation-modal-template');
            const clone = template.content.cloneNode(true);
            clone.getElementById('confirmation-title').textContent = title;
            clone.getElementById('confirmation-message').textContent = message;

            const tempDiv = document.createElement('div');
            tempDiv.appendChild(clone);
            this.show(tempDiv.innerHTML);
            lucide.createIcons();

            const newModal = document.getElementById('the-one-overlay');
            newModal.querySelector('[data-action="confirm"]').addEventListener('click', () => {
                onConfirm();
                this.closeLast();
            });
            newModal.querySelector('[data-action="cancel"]').addEventListener('click', () => this.closeLast());
        },
        showAlert(title, message) {
            const template = document.getElementById('alert-modal-template');
            if (!template) {
                console.error('Alert modal template not found!');
                return;
            }

            const clone = template.content.cloneNode(true);
            clone.getElementById('alert-title').textContent = title;
            clone.getElementById('alert-message').textContent = message;

            const tempDiv = document.createElement('div');
            tempDiv.appendChild(clone);
            this.show(tempDiv.innerHTML);
            lucide.createIcons();
        },
        showLightbox(media) {
            const lightboxHtml = `
                <div id="lightbox-overlay">
                    <span id="lightbox-close">&times;</span>
                    <div id="lightbox-content">
                        <img src="${media.src}" id="lightbox-image">
                    </div>
                </div>`;
            ScarStore.DOMElements.lightboxContainer.innerHTML = lightboxHtml;
            this.initLightboxZoom();
        },
        closeLightbox() {
            this.removeLightboxZoom();
            ScarStore.DOMElements.lightboxContainer.innerHTML = '';
        },
        initLightboxZoom() {
            const image = document.getElementById('lightbox-image');
            if (!image) return;

            image.style.transform = 'scale(1) translate(0px, 0px)';
            image.dataset.scale = 1;
            image.dataset.translateX = 0;
            image.dataset.translateY = 0;

            const overlay = document.getElementById('lightbox-overlay');
            overlay.addEventListener('wheel', this.handleWheel, { passive: false });
            image.addEventListener('mousedown', this.handleMouseDown);
        },
        removeLightboxZoom() {
            const image = document.getElementById('lightbox-image');
            const overlay = document.getElementById('lightbox-overlay');
            if (overlay) {
                overlay.removeEventListener('wheel', this.handleWheel);
            }
            if (image) {
                image.removeEventListener('mousedown', this.handleMouseDown);
            }
        },
        handleWheel(e) {
            e.preventDefault();
            const image = document.getElementById('lightbox-image');
            if (!image) return;

            let scale = parseFloat(image.dataset.scale);
            const rect = image.getBoundingClientRect();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;

            const newScale = Math.max(0.5, Math.min(scale * delta, 10));

            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            let translateX = parseFloat(image.dataset.translateX);
            let translateY = parseFloat(image.dataset.translateY);

            translateX = mouseX - (mouseX - translateX) * (newScale / scale);
            translateY = mouseY - (mouseY - translateY) * (newScale / scale);

            image.dataset.scale = newScale;
            image.dataset.translateX = translateX;
            image.dataset.translateY = translateY;

            image.style.transformOrigin = `0 0`;
            image.style.transform = `translate(${translateX}px, ${translateY}px) scale(${newScale})`;
        },
        handleMouseDown(e) {
            e.preventDefault();
            const image = document.getElementById('lightbox-image');
            if (!image || parseFloat(image.dataset.scale) <= 1) return;

            image.classList.add('is-panning');
            let startX = e.clientX - parseFloat(image.dataset.translateX);
            let startY = e.clientY - parseFloat(image.dataset.translateY);

            const handleMouseMove = (moveEvent) => {
                let translateX = moveEvent.clientX - startX;
                let translateY = moveEvent.clientY - startY;

                image.dataset.translateX = translateX;
                image.dataset.translateY = translateY;
                image.style.transform = `translate(${translateX}px, ${translateY}px) scale(${image.dataset.scale})`;
            };

            const handleMouseUp = () => {
                image.classList.remove('is-panning');
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        },
        promptForPhone() {
            const modalHtml = ScarStore.Templates.getPhoneModalHtml();
            this.show(modalHtml, false);
            this.initIntlTelInput('#user-phone-input');
        },
        promptForName(force = false) {
           if (!ScarStore.state.userInfo.name || force) {
               const modalHtml = ScarStore.Templates.getNameModalHtml();
               this.show(modalHtml);
           }
        },
        saveUserInfo() {
             localStorage.setItem(`scarUserInfo_${ScarStore.state.storeData.config.storageVersion}`, JSON.stringify(ScarStore.state.userInfo));
        },
        showOrderTracking() {
            const modalFragment = ScarStore.Templates.getOrderTrackingModalHtml();
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(modalFragment);
            this.show(tempDiv.innerHTML);
            lucide.createIcons();
        },
        showComplaintModal() {
            const template = document.getElementById('complaint-modal-template');
            if (!template) {
                console.error('Complaint modal template not found!');
                return;
            }
            const clone = template.content.cloneNode(true);
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(clone);
            const modalHtml = tempDiv.innerHTML;
        
            this.show(modalHtml);
        
            const form = document.getElementById('complaint-form');
            const nameInput = form.querySelector('#complaint-name');
            const mainTypeSelect = form.querySelector('#complaint-type');
            const problemContainer = form.querySelector('#problem-type-container');
            const inquiryContainer = form.querySelector('#inquiry-type-container');
            const hasPrevOrderRadios = form.querySelectorAll('input[name="hasPreviousOrder"]');
            const followUpQuestions = form.querySelector('#follow-up-order-questions');
        
            if (ScarStore.state.userInfo.name) nameInput.value = ScarStore.state.userInfo.name;
            this.initIntlTelInput('#complaint-phone');
            const iti = ScarStore.state.phoneInputInstances['complaint-phone'];
            if (iti && ScarStore.state.userInfo.phone) iti.setNumber(ScarStore.state.userInfo.phone);
        
            mainTypeSelect.addEventListener('change', () => {
                const selectedType = mainTypeSelect.value;
                problemContainer.classList.toggle('hidden', selectedType !== 'شكوى');
                inquiryContainer.classList.toggle('hidden', selectedType !== 'استفسار');
            });
            
            hasPrevOrderRadios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    followUpQuestions.classList.toggle('hidden', e.target.value !== 'نعم');
                });
            });
        
            lucide.createIcons();
        },
    },

    Dropdowns: {
        toggle(type, buttonElement) {
            const isCart = type === 'cart';
            const container = isCart ? ScarStore.DOMElements.cartDropdownContainer : ScarStore.DOMElements.wishlistDropdownContainer;
            const otherContainer = isCart ? ScarStore.DOMElements.wishlistDropdownContainer : ScarStore.DOMElements.cartDropdownContainer;
            this.close(otherContainer.querySelector('.header-dropdown'));
            container.children.length === 0 ? this.open(type) : this.close(container.querySelector('.header-dropdown'));
        },
        open(type) {
            const isCart = type === 'cart';
            const container = isCart ? ScarStore.DOMElements.cartDropdownContainer : ScarStore.DOMElements.wishlistDropdownContainer;
            container.innerHTML = isCart ? ScarStore.Templates.getCartDropdownHtml() : ScarStore.Templates.getWishlistDropdownHtml();
            const dropdown = container.querySelector('.header-dropdown');
            if (dropdown) gsap.fromTo(dropdown, { autoAlpha: 0, y: 10 }, { duration: 0.3, autoAlpha: 1, y: 0, ease: 'power2.out' });
            lucide.createIcons();
        },
        close(dropdown) {
            if (!dropdown?.parentElement) return;
            gsap.to(dropdown, {
                duration: 0.2, autoAlpha: 0, y: 10, ease: 'power2.in',
                onComplete: () => {
                    if (dropdown.parentElement) {
                        dropdown.parentElement.innerHTML = ''
                    }
                }
            });
        },
        closeAll() {
            this.close(ScarStore.DOMElements.cartDropdownContainer.querySelector('.header-dropdown'));
            this.close(ScarStore.DOMElements.wishlistDropdownContainer.querySelector('.header-dropdown'));
        }
    }
});