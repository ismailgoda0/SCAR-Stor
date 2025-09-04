// ملف payment.js (الإصدار المتطور والنهائي)

if (!window.ScarStore) window.ScarStore = {};
    const { config } = ScarStore.state.storeData;

ScarStore.Payment = {
    // متغير لتتبع المؤقت ومنعه من العمل بشكل متكرر
    activeTimerInterval: null,
    
    methods: [
        {
            id: 'cod',
            name: 'الدفع نقدي عند الاستلام',
            logo: 'https://i.postimg.cc/rpJmQf2X/cod-logo.png',
            description: 'ادفع لمندوب الشحن عند استلام طلبك.',
            requiresPrepayment: false,
            badge: 'الأكثر شيوعًا'
        },
        {
            id: 'e-wallet',
            name: 'المحفظة الإلكترونية',
            logo: 'https://i.postimg.cc/P50462v6/vodafone-cash-logo.png',
            description: 'فودافون كاش، اورنچ كاش، اتصالات كاش',
            requiresPrepayment: true,
            badge: 'موصى به',
            instructions: `
                <h4 class="font-bold mb-2 text-slate-800">خطوات الدفع عبر المحفظة:</h4>
                <p class="mb-3 text-sm">لديك <span id="wallet-timer" class="font-bold">15:00</span> دقيقة لإتمام التحويل وتأكيد الطلب.</p>
                <ol class="list-decimal list-inside space-y-2 text-sm leading-6">
                    <li>حوّل المبلغ الإجمالي <strong id="payment-amount-wallet" class="text-indigo-600"></strong> على الرقم التالي: 
                        <div class="inline-flex items-center gap-2 bg-slate-100 p-1 rounded-md">
                            <strong class="font-mono" dir="ltr">${config.phone}</strong> 
                            <button type="button" onclick="ScarStore.Payment.copyToClipboard('${config.phone}')" class="copy-btn">📋 نسخ</button>
                        </div>
                    </li>
                    <li>خذ لقطة شاشة (Screenshot) للإيصال.</li>
                    <li><a href="https://wa.me/${config.whatsappNumber}?text=مرحباً،%20لقد%20أتممت%20طلبي%20وهذا%20هو%20إيصال%20الدفع." target="_blank" class="text-green-600 font-semibold underline">أرسل الإيصال على واتساب</a> مع رقم الطلب 
                        <strong id="payment-order-id-wallet" class="text-indigo-600"></strong>.
                    </li>
                </ol>
            `
        },
        {
            id: 'instapay',
            name: 'إنستا باي (InstaPay)',
            logo: 'https://i.postimg.cc/ht60MGC7/instapay-logo.png',
            description: 'حوّل المبلغ مباشرة إلى حسابنا عبر إنستا باي.',
            requiresPrepayment: true,
            instructions: `
                <h4 class="font-bold mb-2 text-slate-800">خطوات الدفع عبر إنستا باي:</h4>
                <ol class="list-decimal list-inside space-y-2 text-sm leading-6">
                    <li>حوّل المبلغ الإجمالي <strong id="payment-amount-ip" class="text-indigo-600"></strong> إلى العنوان التالي:
                        <div class="inline-flex items-center gap-2 bg-slate-100 p-1 rounded-md">
                            <strong class="font-mono">${config.instapay}</strong> 
                            <button type="button" onclick="ScarStore.Payment.copyToClipboard('\${config.instapay}')" class="copy-btn">📋 نسخ</button>
                        </div>
                    </li>
                    <li><a href="https://wa.me/${config.whatsappNumber}?text=مرحباً،%20لقد%20أتممت%20طلبي%20وهذا%20هو%20إيصال%20الدفع." target="_blank" class="text-green-600 font-semibold underline">أرسل الإيصال على واتساب</a> مع رقم الطلب.</li>
                </ol>
            `
        },
        {
            id: 'meeza',
            name: 'كارت ميزة',
            logo: 'https://i.postimg.cc/44N0n0Xw/meeza-logo.png',
            description: 'قريباً... الدفع عبر كروت ميزة.',
            requiresPrepayment: true,
            disabled: true
        }
    ],

    renderOptions(container) {
        if (!container) return;

        const optionsHtml = this.methods.map((opt, index) => {
            const isDisabled = opt.disabled ? 'disabled' : '';
            const disabledClasses = opt.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-indigo-500';

            return `
                <div class="payment-option-wrapper relative">
                    ${opt.badge ? `<span class="payment-badge">${opt.badge}</span>` : ''}
                    <label class="payment-option flex items-center p-3 border rounded-lg transition-colors has-[:checked]:bg-indigo-50 has-[:checked]:border-indigo-500 ${disabledClasses}">
                        <input type="radio" name="payment" value="${opt.id}" class="form-radio" ${index === 0 ? 'checked' : ''} ${isDisabled}>
                        <div class="flex-grow mx-3">
                            <span class="font-semibold block">${opt.name}</span>
                            <span class="text-xs text-slate-500">${opt.description}</span>
                        </div>
                        <img src="${opt.logo}" alt="${opt.name}" class="payment-logo ml-auto flex-shrink-0">
                    </label>
                    <div id="${opt.id}-instructions" class="payment-instructions hidden mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800"></div>
                </div>
            `;
        }).join('');

        container.innerHTML = optionsHtml;
        this.attachEvents();

        // استرجاع آخر خيار دفع استخدمه العميل
        const savedMethodId = localStorage.getItem('scar_selected_payment');
        const savedMethod = this.methods.find(m => m.id === savedMethodId && !m.disabled);
        if (savedMethod) {
            const savedInput = document.querySelector(`input[name="payment"][value="${savedMethod.id}"]`);
            if (savedInput) {
                savedInput.checked = true;
            }
        }
        
        this.handleOptionChange();
    },

    attachEvents() {
        document.querySelectorAll('input[name="payment"]').forEach(input => {
            input.addEventListener('change', () => {
                if (!input.disabled) {
                    localStorage.setItem('scar_selected_payment', input.value);
                    this.handleOptionChange();
                }
            });
        });
    },

    handleOptionChange() {
        if (this.activeTimerInterval) {
            clearInterval(this.activeTimerInterval);
            this.activeTimerInterval = null;
        }

        const selectedOption = document.querySelector('input[name="payment"]:checked');
        const confirmBtn = document.getElementById('confirm-order-btn');
        const btnText = confirmBtn?.querySelector('.button-text');
        if (!selectedOption || !btnText) return;

        document.querySelectorAll('.payment-instructions').forEach(el => el.classList.add('hidden'));

        const method = this.methods.find(m => m.id === selectedOption.value);
        if (method && method.instructions && !method.disabled) {
            const instructionPanel = document.getElementById(`${method.id}-instructions`);
            if (instructionPanel) {
                instructionPanel.innerHTML = method.instructions;
                instructionPanel.classList.remove('hidden');

                if (method.id === 'e-wallet') {
                    this.startTimer('wallet-timer', 15 * 60);
                }
            }
        }

        btnText.textContent = method?.requiresPrepayment ? 'تأكيد الطلب والدفع' : 'تأكيد الطلب';
    },

    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                ScarStore.Toast.show(`تم نسخ: ${text}`, 'success');
            });
        }
    },

    startTimer(elementId, duration) {
        const display = document.getElementById(elementId);
        if (!display) return;
        
        if (this.activeTimerInterval) clearInterval(this.activeTimerInterval);

        let timer = duration;
        this.activeTimerInterval = setInterval(() => {
            let minutes = String(Math.floor(timer / 60)).padStart(2, '0');
            let seconds = String(timer % 60).padStart(2, '0');
            display.textContent = `${minutes}:${seconds}`;

            if (--timer < 0) {
                clearInterval(this.activeTimerInterval);
                display.textContent = "انتهى الوقت";
            }
        }, 1000);
    },

    getSelectedMethod() {
        const selectedInput = document.querySelector('input[name="payment"]:checked');
        return selectedInput ? this.methods.find(m => m.id === selectedInput.value) : null;
    },

    validate() {
        const selectedMethod = this.getSelectedMethod();
        return selectedMethod && !selectedMethod.disabled;
    }
};
