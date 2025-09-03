// FILE: modules.js
if (!window.ScarStore) { window.ScarStore = {}; }

Object.assign(ScarStore, {
    Templates: {

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
                <a href="?view=cart" id="show-cart-products-btn" class="w-full text-center py-2 px-4 bg-slate-200 text-slate-800 font-bold rounded-lg hover:bg-slate-300 transition-colors block hidden md:block">عرض وتعديل السلة</a>
                <button id="checkout-btn" class="primary-btn w-full">إتمام الشراء</button>
            </div>
            ` : ''}
        </div>
    `;
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
        <div class="bg-slate-100 p-4 rounded-lg text-center text-slate-700">
            <p>عذرًا، لم نتمكن من العثور على طلب بالمعرّف التالي:</p>
            <p class="font-mono font-bold text-lg my-2">${orderId}</p>
            <p>يرجى التأكد من كتابة المعرّف بشكل صحيح والمحاولة مرة أخرى.</p>
        </div>
    `;
    return clone;
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
                 <a href="?view=wishlist" id="show-wishlist-products-btn" class="primary-btn interactive-btn text-center hidden md:block">عرض المنتجات في الصفحة</a>
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
        getVariantsHtml(product, isCard = false, selectedOptions = {}, cartId = null) {
            const container = document.createElement('div');
            const { variants } = product;
            if (!variants) return '';
        
            const idPrefix = cartId ? cartId : product.id;

            if (variants['اللون']) {
                const key = 'اللون';
                const name = `option-${idPrefix}-${key}`;
                const optionsHtml = product.variants[key].map((option, index) => {
                    const value = typeof option === 'object' ? option.value : option;
                    const nameAttr = typeof option === 'object' ? option.name || value : value;
                    const style = `background-color:${value}`;
                    
                    let isChecked = false;
                    if (selectedOptions && selectedOptions[key]) {
                        isChecked = selectedOptions[key] === value;
                    } else if (index === 0) {
                        isChecked = true;
                    }

                    return `
                        <label class="product-option-label cursor-pointer">
                            <input type="radio" name="${name}" value="${value}" class="sr-only product-variant-selector" ${isChecked ? 'checked' : ''} data-product-id="${product.id}" data-variant-key="${key}">
                            <span class="product-option-value color-swatch ${isCard ? '!w-6 !h-6' : 'w-8 h-8'} relative block rounded-full border-2 border-transparent" style="${style}" title="${nameAttr}"></span>
                        </label>`;
                }).join('');
                
                const labelHtml = isCard ? '' : `<label class="font-semibold text-sm w-24">${key}:</label>`;
                container.innerHTML += `<div class="flex items-center gap-4">${labelHtml}<div class="flex flex-wrap items-center gap-2">${optionsHtml}</div></div>`;
            }
        
            if (variants['موديل الهاتف']) {
                const key = 'موديل الهاتف';
                const name = `option-${idPrefix}-${key}`;
                const optionsHtml = variants[key].map(opt => `<option value="${opt.value}" ${selectedOptions[key] === opt.value ? 'selected' : ''}>${opt.value}</option>`).join('');
                const selectHtml = `<select name="${name}" class="form-select searchable-select text-sm flex-1 product-variant-selector" data-variant-key="${key}">${optionsHtml}</select>`;
                
                if(isCard) {
                     container.innerHTML += `<div class="flex-grow min-w-[120px] mt-2">${selectHtml}</div>`;
                } else {
                     container.innerHTML += `<div class="mt-4">${selectHtml}</div>`;
                }
            }
            
            return container.innerHTML;
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
            const thumbnailsHtml = product.images.map((img, index) => `<div class="p-1 rounded-lg cursor-pointer ${index === 0 ? 'ring-2 ring-indigo-500' : ''} border product-thumbnail-item" data-image-index="${index}"><img src="${img}" alt="Thumbnail ${index + 1}" class="w-full h-full object-cover rounded-md pointer-events-none" onerror="this.onerror=null;this.src='https://placehold.co/100x100/e2e8f0/475569?text=SCAR';"></div>`).join('');
            let stockHtml;
            if (product.stock <= 0) {
                stockHtml = `<div class="stock-indicator out-of-stock inline-block">نفدت الكمية</div>`;
            } else if (product.stock <= ScarStore.state.storeData.config.lowStockThreshold) {
                stockHtml = `<div class="stock-indicator low-stock inline-block">⏳ متبقي ${product.stock} قطع فقط</div>`;
            } else {
                stockHtml = `<div class="stock-indicator bg-green-100 text-green-800 inline-block">متوفر (${product.stock} قطعة)</div>`;
            }
            return `<div><div class="mb-6"><button id="back-btn" class="flex items-center gap-2 text-slate-600 font-semibold hover:text-indigo-600 transition-colors"><i data-lucide="arrow-right"></i><span>العودة للخلف</span></button></div><div class="bg-white p-6 md:p-8 rounded-xl shadow-sm mb-8"><div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12"><div class="space-y-4"><div class="relative group"><img src="${product.images[0]}" alt="${product.name}" class="main-product-img w-full rounded-lg object-cover aspect-square border cursor-pointer" data-action="open-lightbox" onerror="this.onerror=null;this.src='https://placehold.co/600x600/e2e8f0/475569?text=SCAR';"><div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"><i data-lucide="zoom-in" class="w-16 h-16 text-white"></i></div></div><div class="grid grid-cols-5 gap-2">${thumbnailsHtml}</div></div><div class="space-y-6 flex flex-col"><div class="space-y-2"><div class="flex justify-between items-start"><h1 class="text-3xl md:text-4xl font-extrabold text-slate-800">${product.name}</h1><div class="flex items-center gap-2"><button class="love-btn p-2 bg-slate-100 rounded-full" data-id="${product.id}" aria-label="إضافة إلى المفضلة"><i data-lucide="heart" class="w-7 h-7 icon-heart pointer-events-none"></i></button><button id="share-product-btn" class="p-2 bg-slate-100 rounded-full" data-id="${product.id}" data-name="${product.name}" aria-label="مشاركة المنتج"><i data-lucide="share-2" class="w-7 h-7 text-slate-600 pointer-events-none"></i></button></div></div><div class="flex items-center gap-4 text-sm text-slate-500 flex-wrap"><span>ID: <span class="font-semibold text-slate-700">${product.id}</span></span><span class="w-px h-4 bg-slate-300"></span><span>الماركة: <span class="font-semibold text-slate-700">${product.brand}</span></span><span class="w-px h-4 bg-slate-300"></span><span>الضمان: <span class="font-semibold text-slate-700">${product.warranty || 'لا يوجد'}</span></span><span class="w-px h-4 bg-slate-300"></span><span>بلد الصنع: <span class="font-semibold text-slate-700">${product.countryOfOrigin}</span></span></div></div><div class="price-container flex items-baseline gap-3"><p class="product-price text-4xl font-extrabold text-indigo-600">${product.basePrice} ${currency}</p><p class="product-old-price text-xl text-slate-500 line-through ${product.oldPrice ? '' : 'hidden'}">${product.oldPrice} ${currency}</p></div><p class="text-slate-600 leading-relaxed flex-grow">${product.description}</p><div class="border-t pt-6 space-y-4"><div class="flex items-center gap-4">${stockHtml}</div><div class="variants-container"></div><div class="action-button-container" data-product-id="${product.id}"></div></div></div></div></div></div>`;
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
        getOrderSuccessModalHtml(orderId) {
            return `
            <div class="modal-content bg-white rounded-xl shadow-2xl w-full max-w-md p-6 text-center">
                <div class="success-animation mx-auto mb-4">
                    <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                        <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                        <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                    </svg>
                </div>
                <h2 class="text-2xl font-bold mt-4 mb-2">تم استلام طلبك بنجاح!</h2>
                <p class="text-slate-500 mb-6">
                    طلبك في طريقه إليك. سنرسل لك رسالة تأكيد على واتساب قريباً.
                    احتفظ بمعرّف الطلب لمتابعته معنا:
                </p>
                <div class="bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg p-3 flex items-center justify-between gap-4 mb-6">
                    <span id="order-id-text" class="font-mono font-bold text-indigo-600 text-lg">${orderId}</span>
                    <button id="copy-order-id-btn" data-order-id="${orderId}" class="secondary-btn !p-2" title="نسخ المعرف">
                        <i data-lucide="copy" class="w-5 h-5"></i>
                    </button>
                </div>
                <button onclick="ScarStore.Modals.closeLast()" class="primary-btn w-full">حسناً</button>
            </div>
            `;
        },

      // FILE: modules.js

getCheckoutModalHtml() {
    const { cart, productMap, storeData: { config }, userInfo } = ScarStore.state;
    const { currency, shippingOptions, governorates } = config;
    const { name, governorate, address } = userInfo; // جلب البيانات المحفوظة

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const allShippingOptions = [...shippingOptions, { name: "الاستلام من الفرع", cost: 0 }];
    const firstShippingCost = allShippingOptions.length > 0 ? allShippingOptions[0].cost : 0;
    const grandTotal = subtotal + firstShippingCost;

    const itemsSummary = cart.map(item => {
        const product = productMap.get(item.id);
        if (!product) return '';
        
        let optionsHtml = '';
        if (item.options) {
            const optionsEntries = Object.entries(item.options);
            if (optionsEntries.length > 0) {
                const optionsArray = optionsEntries.map(([key, value]) => {
                    if (key === 'اللون') {
                        return `
                            <div class="flex items-center gap-2">
                                <span class="font-semibold">${key}:</span>
                                <span class="block w-4 h-4 rounded-full border" style="background-color: ${value};" title="${value}"></span>
                            </div>
                        `;
                    } else if (key === 'موديل الهاتف' && typeof value === 'object') {
                         const models = Object.entries(value).map(([model, qty]) => `${model} (x${qty})`).join(', ');
                         return `<div><span class="font-semibold">${key}:</span> ${models}</div>`;
                    }
                    return `<div><span class="font-semibold">${key}:</span> ${value}</div>`;
                });
                optionsHtml = `<div class="flex flex-col items-start gap-1 text-xs text-slate-500 mt-1">${optionsArray.join('')}</div>`;
            }
        }
        
        const imageUrl = (product.isBundle && product.images && product.images.length > 0) ? product.images[0] : product.heroImage || (product.isBundle ? productMap.get(product.items[0].productId)?.images[0] : product.images[0]);
        return `<div class="flex items-start gap-4 py-3"><img src="${imageUrl}" class="w-20 h-20 rounded-md object-cover flex-shrink-0" onerror="this.onerror=null;this.src='https://placehold.co/100x100/e2e8f0/475569?text=SCAR';"><div class="flex-grow"><p class="font-bold text-slate-800">${product.name}</p><p class="text-sm text-slate-500">الكمية: ${item.quantity}</p>${optionsHtml}</div><p class="font-bold text-slate-800 text-sm flex-shrink-0">${(item.price * item.quantity).toFixed(2)} ${currency}</p></div>`;
    }).join('');

    const shippingOptionsHtml = allShippingOptions.map((opt, index) => `<label class="flex items-center p-3 border rounded-lg cursor-pointer hover:border-indigo-500"><input type="radio" name="shipping" value="${opt.name}" data-cost="${opt.cost}" class="ml-3" ${index === 0 ? 'checked' : ''}><div class="flex-grow"><span class="font-semibold">${opt.name}</span></div><span class="font-bold">${opt.cost > 0 ? `${opt.cost} ${currency}` : 'مجاني'}</span></label>`).join('');
    
    // استخدام `governorate` المحفوظ لتحديد الخيار المختار
    const governoratesOptionsHtml = governorates.map(gov => `<option value="${gov}" ${governorate === gov ? 'selected' : ''}>${gov}</option>`).join('');

    return `<div class="modal-content bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div class="p-5 border-b flex justify-between items-center flex-shrink-0">
            <h2 class="text-2xl font-bold">إتمام الطلب</h2>
            <button class="close-modal-btn"><i data-lucide="x" class="w-6 h-6"></i></button>
        </div>
        <div class="flex-grow overflow-y-auto p-6">
            <form id="checkout-form" class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div class="space-y-6">
                    <div>
                        <h3 class="font-bold text-xl mb-4 flex items-center gap-2"><i data-lucide="user-round" class="w-6 h-6 text-indigo-500"></i>1. بيانات العميل</h3>
                        <div class="space-y-4">
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label for="customer-name" class="block text-sm font-medium text-slate-700 mb-1">الاسم الكامل</label>
                                    <input type="text" id="customer-name" name="name" class="form-input" placeholder="مثال: محمد أحمد" required value="${name || ''}">
                                </div>
                                <div>
                                    <label for="customer-phone" class="block text-sm font-medium text-slate-700 mb-1">رقم الهاتف</label>
                                    <input type="tel" id="customer-phone" name="phone" class="form-input iti-input" required>
                                </div>
                            </div>
                            <div>
                                <label for="customer-governorate" class="block text-sm font-medium text-slate-700 mb-1">المحافظة</label>
                                <select id="customer-governorate" name="governorate" class="form-select" required>${governoratesOptionsHtml}</select>
                            </div>
                            <div>
                                <label for="customer-address" class="block text-sm font-medium text-slate-700 mb-1">العنوان بالتفصيل</label>
                                <textarea id="customer-address" name="address" class="form-textarea" rows="2" placeholder="الشارع، رقم المبنى، علامة مميزة..." required>${address || ''}</textarea>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h3 class="font-bold text-xl mb-4 flex items-center gap-2"><i data-lucide="truck" class="w-6 h-6 text-indigo-500"></i>2. طريقة الشحن</h3>
                        <div class="space-y-3">${shippingOptionsHtml}</div>
                    </div>
                    <div>
                        <h3 class="font-bold text-xl mb-4 flex items-center gap-2"><i data-lucide="hand-coins" class="w-6 h-6 text-indigo-500"></i>3. طريقة الدفع</h3>
                        <div class="p-3 border rounded-lg bg-slate-100 flex items-center gap-3">
                            <i data-lucide="check-circle" class="w-6 h-6 text-green-600"></i>
                            <span class="font-semibold">الدفع عند الاستلام</span>
                        </div>
                    </div>
                </div>
                <div id="summary-panel" class="bg-slate-50 p-4 rounded-lg h-fit sticky top-0">
                    <div class="flex justify-between items-center mb-4 border-b pb-3">
                        <h3 class="font-bold text-xl">ملخص الطلب</h3>
                        <button type="button" id="copy-summary-btn" class="p-2 rounded-full hover:bg-slate-200 transition-colors" title="نسخ ملخص الطلب كصورة">
                            <i data-lucide="copy" class="w-5 h-5"></i>
                        </button>
                    </div>
                    <div class="space-y-2 divide-y max-h-80 overflow-y-auto custom-scrollbar pr-2">${itemsSummary}</div>
                    <div class="mt-4 pt-4 border-t space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span>المجموع الفرعي:</span>
                            <span id="summary-subtotal">${subtotal.toFixed(2)} ${currency}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>رسوم الشحن:</span>
                            <span id="summary-shipping">${firstShippingCost.toFixed(2)} ${currency}</span>
                        </div>
                        <div class="flex justify-between font-bold text-lg mt-2 pt-2 border-t text-indigo-700">
                            <span>الإجمالي:</span>
                            <span id="summary-total">${grandTotal.toFixed(2)} ${currency}</span>
                        </div>
                    </div>
                </div>
            </form>
        </div>
        <div class="p-5 border-t bg-slate-100 flex-shrink-0">
            <button type="submit" form="checkout-form" class="primary-btn w-full interactive-btn flex items-center justify-center gap-2 text-lg !py-3">
                <span class="button-text">تأكيد الطلب</span>
                <div class="spinner hidden"></div>
            </button>
        </div>
    </div>`;
},
        getPhoneModalHtml() {
            return `<div class="modal-content bg-white rounded-xl shadow-2xl w-full max-w-sm"><div class="p-6 text-center"><h2 class="text-2xl font-bold mb-2">مرحباً بك في متجر SCAR!</h2><p class="text-slate-500 mb-4">نحتاج رقم هاتفك ليسهل علينا التواصل معك ومتابعة طلباتك.</p><form id="phone-form" novalidate><input type="tel" id="user-phone-input" class="form-input iti-input" required><p id="phone-error" class="text-red-500 text-sm mt-1 h-4"></p><button type="submit" class="primary-btn w-full mt-2">حفظ ومتابعة</button></form></div></div>`;
        },
        getNameModalHtml() {
             return `<div class="modal-content bg-white rounded-xl shadow-2xl w-full max-w-sm"><div class="p-6 text-center"><h2 class="text-2xl font-bold mb-2">اسمك الكريم؟</h2><p class="text-slate-500 mb-4">نريد معرفة اسمك لتحسين تجربتك وتسهيل عملية الطلب لاحقًا.</p><form id="name-form"><input type="text" id="user-name-input" class="form-input text-center" placeholder="الاسم الكامل" required><button type="submit" class="primary-btn w-full mt-4">حفظ الاسم</button></form></div></div>`;
        },

getComplaintModalHtml() {
    // قراءة اسم المستخدم المحفوظ من الحالة العامة للمتجر
    const { name } = ScarStore.state.userInfo;
    
    return `
        <div class="modal-content bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div class="p-5 border-b flex justify-between items-center">
                <h2 class="text-2xl font-bold">الشكاوي والملاحظات</h2>
                <button class="close-modal-btn"><i data-lucide="x" class="w-6 h-6"></i></button>
            </div>
            <div class="p-6">
                <form id="complaint-form">
                    <div class="space-y-4">
                        <div>
                            <label for="complaint-name" class="block text-sm font-medium text-slate-700 mb-1">الاسم</label>
                            <input type="text" id="complaint-name" name="name" class="form-input" required value="${name || ''}">
                        </div>
                        <div>
                            <label for="complaint-phone" class="block text-sm font-medium text-slate-700 mb-1">رقم الهاتف</label>
                            <input type="tel" id="complaint-phone" name="phone" class="form-input iti-input" required>
                        </div>
                        <div>
                            <label for="complaint-message" class="block text-sm font-medium text-slate-700 mb-1">الرسالة</label>
                            <textarea id="complaint-message" name="message" class="form-textarea" rows="4" required placeholder="اكتب شكواك أو ملاحظتك هنا..."></textarea>
                        </div>
                        <button type="submit" class="primary-btn w-full interactive-btn flex items-center justify-center gap-2 !py-2.5">
                            <span class="button-text">إرسال</span>
                            <div class="spinner hidden"></div>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
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

      // FILE: modules.js (استبدال كامل للدالة)
getOrderTrackingModalHtml() {
    const template = document.getElementById('order-tracking-modal-template');
    const clone = template.content.cloneNode(true);
    const pastOrdersList = clone.getElementById('past-orders-list');
    const storageVersion = ScarStore.state.storeData.config.storageVersion || 'v-fallback';
    const pastOrders = JSON.parse(localStorage.getItem(`scarOrders_${storageVersion}`) || '[]');

    if (pastOrders.length > 0) {
        // عرض أحدث 5 طلبات
        pastOrders.reverse().slice(0, 5).forEach(order => {
            const orderDiv = document.createElement('div');
            // -->> إضافة: data-order-id لتسهيل النقر عليه
            orderDiv.className = 'past-order-item flex justify-between items-center p-2 bg-white rounded cursor-pointer hover:bg-indigo-100 text-sm';
            orderDiv.dataset.orderId = order.id;

            const orderIdSpan = document.createElement('span');
            orderIdSpan.className = 'font-mono';
            orderIdSpan.textContent = order.id;

            const orderDateSpan = document.createElement('span');
            orderDateSpan.className = 'text-xs text-slate-500';
            // -->> إضافة: تنسيق التاريخ ليكون سهل القراءة
            orderDateSpan.textContent = new Date(order.date).toLocaleDateString('ar-EG');
            
            orderDiv.append(orderIdSpan, orderDateSpan);
            pastOrdersList.appendChild(orderDiv);
        });
    } else {
        pastOrdersList.innerHTML = `<p class="text-center text-xs text-slate-500">لا توجد طلبات سابقة محفوظة على هذا المتصفح.</p>`;
    }
    return clone;
},
  // استبدل الدالة الحالية بهذه النسخة المحدثة
getOrderStatusModalHtml(statusData) {
    const template = document.getElementById('order-status-modal-template');
    const clone = template.content.cloneNode(true);
    const display = clone.getElementById('status-display');
    
    // --- منطق تشفير البيانات ---
    let maskedName = 'N/A';
    if (statusData.name && statusData.name.length > 2) {
        maskedName = statusData.name.substring(0, 3) + '***';
    }
    
    let maskedPhone = 'N/A';
    if (statusData.phone && statusData.phone.toString().length > 3) {
        const phoneStr = statusData.phone.toString();
        maskedPhone = '*******' + phoneStr.slice(-3);
    }

    // --- منطق تنسيق التواريخ ---
    const orderDate = new Date(statusData.date).toLocaleDateString('ar-EG', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    
    const lastModifiedDate = new Date(statusData.lastModified).toLocaleString('ar-EG', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    
    // ✅ START: منطق الأيقونات والألوان المحسّن
    let icon = 'package-search'; // أيقونة افتراضية
    let color = 'text-slate-500';  // لون افتراضي

    const status = statusData.status.trim(); // .trim() لإزالة أي مسافات زائدة

    if (status.includes('قيد المراجعة')) {
        icon = 'hourglass';       // ⏳ انتظار
        color = 'text-blue-500';  // أزرق: للمراجعة

    } else if (status.includes('جاري التوصيل')) {
        icon = 'truck';         // 📍 تحديد الموقع
        color = 'text-indigo-500';  // أخضر فاتح: قريب من الوصول
    } else if (status.includes('تم التسليم') || status.includes('تم استلام')) {
        icon = 'check-circle-2';  // ✅ تم بنجاح
        color = 'text-green-600'; // أخضر: نجاح
    } else if (status.includes('ملغي')) {
        icon = 'x-circle';        // ❌ إلغاء
        color = 'text-red-600';   // أحمر: إلغاء أو خطأ
    } else if (status.includes('مؤجل')) {
        icon = 'pause-circle';    // ⏸️ مؤجل
        color = 'text-amber-500'; // كهرماني: تعليق
    } 
    // ✅ END: منطق الأيقونات والألوان المحسّن

    display.innerHTML = `
        <p class="font-mono text-center text-slate-500 text-sm"><strong>ID:</strong> ${statusData.id}</p>
        
        <div class="text-center py-4 border-b">
            <i data-lucide="${icon}" class="w-16 h-16 mx-auto ${color}"></i>
            <h3 class="text-2xl font-bold mt-3">${statusData.status}</h3>
            <p class="text-xs text-slate-500 mt-1">آخر تحديث: ${lastModifiedDate}</p>
        </div>

        <div class="bg-slate-100 p-3 rounded-lg text-center text-slate-700 my-4">
            <p>${statusData.text}</p>
        </div>

        <div>
            <h4 class="font-bold mb-2">تفاصيل الفاتورة:</h4>
            <div class="space-y-2 text-sm border rounded-lg p-3">
                <div class="flex justify-between">
                    <span class="text-slate-500">تاريخ الطلب:</span>
                    <span class="font-semibold">${orderDate}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-slate-500">اسم العميل:</span>
                    <span class="font-semibold">${maskedName}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-slate-500">رقم الهاتف:</span>
                    <span class="font-semibold" dir="ltr">${maskedPhone}</span>
                </div>
                <div class="flex justify-between pt-2 border-t mt-2 font-bold text-base">
                    <span>الإجمالي:</span>
                    <span class="text-indigo-600">${statusData.totalPrice} ${ScarStore.state.storeData.config.currency}</span>
                </div>
            </div>
        </div>
    `;
    return clone;
},
    },

    Cart: {
        generateCartItemId(productId, options) {
            if (!options || Object.keys(options).length === 0) return productId;
            const sortedOptions = Object.keys(options).sort().map(key => `${key}-${options[key]}`).join('_');
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
    this.updateUI(); // <<-- هذا السطر هو مفتاح الحل
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

            // البحث عن زر النسخ وإضافة معالج النقر مباشرة
            const copyBtn = newContent.querySelector('#copy-order-id-btn');
            if (copyBtn) {
                copyBtn.addEventListener('click', () => {
                    const orderId = copyBtn.dataset.orderId;
                    if (!orderId) return;

                    navigator.clipboard.writeText(orderId).then(() => {
                        ScarStore.Toast.show('تم نسخ معرّف الطلب!', 'success');
                        
                        // تغيير الأيقونة مؤقتًا للتأكيد البصري
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
        handleCheckout() {
            const modalHtml = ScarStore.Templates.getCheckoutModalHtml();
            this.show(modalHtml);
            this.initIntlTelInput('#customer-phone');

            const iti = ScarStore.state.phoneInputInstances['customer-phone'];
            if (iti && ScarStore.state.userInfo.phone) {
                iti.setNumber(ScarStore.state.userInfo.phone);
            }
            
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