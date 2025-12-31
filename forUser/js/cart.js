// ---- Utils & State
const fmtJPY = (n) => "¥" + n.toLocaleString("ja-JP");
const clampQty = (v) => Math.max(1, Math.min(999, Number(v) || 1));

// 一度フォーカスが当たった要素のIDを記録するSet
// 「未入力時に赤くなるのは一度でもフォーカスが当たってから」を実現するため
const touchedFields = new Set();

// OTP認証完了フラグ
let isOtpVerified = false;

// ---- Cart Logic
function recalcTotals() {
    const list = document.querySelectorAll("#cart-list [data-line-total]");
    let subtotal = 0;
    list.forEach((el) => {
        const line = Number((el.getAttribute("data-line-total-raw")) || el.textContent.replace(/[^\d]/g, ""));
        subtotal += line;
    });
    const tax = 0;
    const shipping = 0; 
    const grand = subtotal + tax + shipping;

    const subEl = document.getElementById("subtotal");
    const shipEl = document.getElementById("shipping");
    const grandEl = document.getElementById("grandTotal");

    if (subEl) subEl.textContent = fmtJPY(subtotal);
    if (shipEl) shipEl.textContent = fmtJPY(shipping);
    if (grandEl) grandEl.textContent = fmtJPY(grand);

    // バッジ
    const totalQty = [...document.querySelectorAll("[data-qty]")].reduce((a, i) => a + clampQty(i.value), 0);
    const badge = document.getElementById("cart-badge");
    if (badge) badge.textContent = Math.min(totalQty, 99);
}

function bindCart() {
    const root = document.getElementById("cart-list");
    if (!root) return;

    root.addEventListener("click", (e) => {
        const li = e.target.closest("li");
        if (!li) return;
        if (e.target.matches("[data-remove]")) {
            li.remove();
            if (!root.querySelector("li")) {
                root.innerHTML = `<li class="text-gray-500 text-sm text-center py-4">カートに商品はありません。</li>`;
            }
            recalcTotals();
        }
    });
}

// ---- Validation System
const requiredIds = [
    "name_sei", "name_mei", 
    "kana_sei", "kana_mei", 
    "email", "tel", 
    "zip", "pref", "city","org_display", "employee_number","gender"
];

function setError(id, hasError) {
    const input = document.getElementById(id);
    if (!input) return;

    // メッセージの表示制御
    const msg = document.querySelector(`[data-error-for="${id}"]`);
    
    // 「エラーがある」かつ「ユーザーが一度触った(touched) or 送信しようとした」場合のみ赤くする
    const shouldShowError = hasError && touchedFields.has(id);

    if (shouldShowError) {
        input.classList.add("input-error");
        if(msg) msg.classList.remove("hidden");
    } else {
        input.classList.remove("input-error");
        if(msg) msg.classList.add("hidden");
    }
}

function getEnrollType() {
    const checked = document.querySelector('input[name="enrollType"]:checked');
    return checked ? checked.value : null;
}

function validate(isSubmit = false) {
    let isAllValid = true;

    // 1. 基本必須チェック
    requiredIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        
        // 送信時は全フィールドを「触った」扱いにすることで、未入力箇所を一斉に赤くする
        if (isSubmit) touchedFields.add(id);

        const valid = el.checkValidity();
        setError(id, !valid);
        if (!valid) isAllValid = false;
    });

    // 2. 受講区分
    const enrollType = getEnrollType();
    if (isSubmit) touchedFields.add("enrollType");
    if (!enrollType) {
        setError("enrollType", true);
        isAllValid = false;
    } else {
        setError("enrollType", false);
    }

    // 3. 再受講番号
    if (enrollType === "re") {
        const prevNo = document.getElementById("prevEnrollNo");
        if (isSubmit) touchedFields.add("prevEnrollNo");
        const has = prevNo.value.trim().length > 0;
        setError("prevEnrollNo", !has);
        if (!has) isAllValid = false;
    } else {
        // 新規の場合はエラー解除
        setError("prevEnrollNo", false);
    }

    // 4. カタカナチェック
    ["kana_sei", "kana_mei"].forEach(id => {
        const el = document.getElementById(id);
        if (isSubmit) touchedFields.add(id);
        if (el && el.value && !el.value.match(/^[\u30A0-\u30FF\sー－]+$/)) {
            setError(id, true);
            isAllValid = false;
        }
    });

    // 5. 郵便番号形式
    const zip = document.getElementById("zip");
    if (isSubmit) touchedFields.add("zip");
    // 3桁-4桁 or 7桁数字
    if (zip && zip.value && !zip.value.match(/^\d{3}-?\d{4}$/)) { 
        setError("zip", true); 
        isAllValid = false; 
    }

    // 6. OTP認証チェック
    const emailEl = document.getElementById("email");
    if (emailEl && emailEl.value && !isOtpVerified) {
        // メール入力済みなのに認証未完の場合
        if (isSubmit) {
            touchedFields.add("emailOtp");
            setError("emailOtp", true);
        }
        isAllValid = false;
    } else {
        setError("emailOtp", false);
    }

    // 7. 同意チェック
    const agree = document.getElementById("agree");
    if (isSubmit) touchedFields.add("agree");
    if (!agree.checked) {
        if (isSubmit) setError("agree", true);
        isAllValid = false;
    } else {
        setError("agree", false);
    }

    // アラート制御
    const alertBox = document.getElementById("form-alert");
    if (isSubmit && !isAllValid) {
        alertBox.classList.remove("hidden");
        // alertBox.textContent = "入力内容に不備があります。赤枠の項目を確認してください。"; // DOM内に記述済み
        alertBox.scrollIntoView({behavior: "smooth", block: "center"});
    } else if (isAllValid) {
        alertBox.classList.add("hidden");
    }

    return isAllValid;
}

// ---- OTP Logic (Demo)
function bindOtpLogic() {
    const sendBtn = document.getElementById("send-otp");
    const verifyBtn = document.getElementById("verify-otp");
    const emailInput = document.getElementById("email");
    const otpInput = document.getElementById("emailOtp");
    const statusText = document.getElementById("otp-status");
    const demoText = document.getElementById("otp-demo");

    if (sendBtn) {
        sendBtn.addEventListener("click", () => {
            touchedFields.add("email");
            if (!emailInput.value || !emailInput.checkValidity()) {
                setError("email", true);
                return;
            }
            setError("email", false);
            alert("認証コードを送信しました。\nデモコード: 123456");
            otpInput.disabled = false;
            verifyBtn.disabled = false;
            otpInput.focus();
            statusText.textContent = "入力待ち";
            statusText.className = "text-sky-600 font-bold ml-2";
            demoText.textContent = "コード: 123456";
        });
    }

    if (verifyBtn) {
        verifyBtn.addEventListener("click", () => {
            if (otpInput.value === "123456") {
                isOtpVerified = true;
                statusText.textContent = "認証完了";
                statusText.className = "text-emerald-600 font-bold ml-2";
                otpInput.disabled = true;
                verifyBtn.disabled = true;
                sendBtn.disabled = true;
                emailInput.readOnly = true;
                emailInput.classList.add("bg-gray-100", "text-gray-500");
                setError("emailOtp", false);
                validate(false);
            } else {
                alert("コードが間違っています。");
                isOtpVerified = false;
                setError("emailOtp", true);
            }
        });
    }
}

// ---- Input Helpers & Zip Logic
function bindInputHelpers() {
    // 1. 郵便番号＆住所反映ロジック
    const zipInput = document.getElementById("zip");
    if (zipInput) {
        zipInput.addEventListener("keyup", (e) => {
            // 数字以外除去
            let val = zipInput.value.replace(/[^\d\-]/g, "");
            
            // ハイフン自動挿入 (3桁超えたら入れる)
            const nums = val.replace(/-/g, "");
            if (nums.length > 3) {
                val = nums.slice(0, 3) + "-" + nums.slice(3, 7);
            }
            zipInput.value = val;

            // 住所検索実行 (AjaxZip3)
            // 7桁以上(ハイフン込みで8文字など)になったら検索を試みる
            if (nums.length >= 7) {
                // AjaxZip3はグローバル関数。name属性をターゲットにする。
                // 第1引数:this, 第2:建物名(空), 第3:都道府県name, 第4:市区町村name
                if (typeof AjaxZip3 !== 'undefined') {
                    AjaxZip3.zip2addr(zipInput, '', 'pref', 'city');
                    
                    // AjaxZip3が値を埋めた瞬間はinputイベントが発火しないことがあるため
                    // 少し待ってからpref/cityをvalid判定させる
                    setTimeout(() => {
                        touchedFields.add("pref");
                        touchedFields.add("city");
                        validate(false);
                    }, 500);
                }
            }
        });
    }

    // 2. 電話番号 (数字のみ)
    const telInput = document.getElementById("tel");
    if (telInput) {
        telInput.addEventListener("input", (e) => {
            e.target.value = e.target.value.replace(/[^\d\-]/g, "");
        });
    }
}

// ---- UI Bindings
function bindEnrollTypeUI() {
    const radios = document.querySelectorAll('input[name="enrollType"]');
    const block = document.getElementById("re-enroll-block");
    const label = document.getElementById("enrollTypeLabel");
    
    const refresh = () => {
        const t = getEnrollType();
        if (t === "re") {
            block.classList.remove("hidden");
            label.textContent = "再受講";
        } else {
            block.classList.add("hidden");
            label.textContent = "新規受講";
        }
    };
    radios.forEach(r => r.addEventListener("change", refresh));
    refresh();
}

function bindPrivacyModal() {
    const modal = document.getElementById("privacy-modal");
    const openBtn = document.getElementById("open-privacy");
    const closeBtns = [
        document.getElementById("privacy-close"),
        document.getElementById("privacy-cancel"),
        document.getElementById("privacy-backdrop")
    ];
    const agreeCheck = document.getElementById("agree");
    const modalAgree = document.getElementById("modal-agree");
    const confirmBtn = document.getElementById("privacy-confirm");

    if (openBtn) openBtn.addEventListener("click", () => modal.classList.remove("hidden"));
    closeBtns.forEach(btn => btn?.addEventListener("click", () => modal.classList.add("hidden")));

    if (modalAgree) modalAgree.addEventListener("change", () => confirmBtn.disabled = !modalAgree.checked);
    
    if (confirmBtn) {
        confirmBtn.addEventListener("click", () => {
            if(!modalAgree.checked) return;
            modal.classList.add("hidden");
            agreeCheck.checked = true;
            // 同意チェックがついたので即座にエラー消去確認
            validate(false);
        });
    }
}

// ---- Organization Logic (Miller Columns)

// ダミーデータ定義（実際はAPI等から取得）
const orgStructure = [
    {
        id: "1", name: "営業本部", children: [
            { id: "1-1", name: "第一営業部", children: [
                { id: "1-1-1", name: "営業一課" },
                { id: "1-1-2", name: "営業二課" },
                { id: "1-1-3", name: "CS推進チーム" }
            ]},
            { id: "1-2", name: "第二営業部", children: [
                { id: "1-2-1", name: "関西営業課" },
                { id: "1-2-2", name: "九州営業課" }
            ]}
        ]
    },
    {
        id: "2", name: "開発本部", children: [
            { id: "2-1", name: "プロダクト開発部", children: [
                { id: "2-1-1", name: "フロントエンド課" },
                { id: "2-1-2", name: "バックエンド課" },
                { id: "2-1-3", name: "SREチーム" }
            ]},
            { id: "2-2", name: "研究開発部", children: [
                { id: "2-2-1", name: "AI研究室" },
                { id: "2-2-2", name: "ブロックチェーン研究室" }
            ]}
        ]
    },
    {
        id: "3", name: "管理本部", children: [
            { id: "3-1", name: "人事総務部", children: [
                { id: "3-1-1", name: "採用チーム" },
                { id: "3-1-2", name: "労務チーム" }
            ]},
            { id: "3-2", name: "経理財務部", children: [
                { id: "3-2-1", name: "経理課" },
                { id: "3-2-2", name: "財務課" }
            ]}
        ]
    }
];

function bindOrgPicker() {
    const modal = document.getElementById("org-modal");
    const openInput = document.getElementById("org_display");
    const hiddenInput = document.getElementById("org_value");
    const closeBtns = [
        document.getElementById("org-close"),
        document.getElementById("org-cancel"),
        document.getElementById("org-backdrop")
    ];
    const confirmBtn = document.getElementById("org-confirm");
    const tempDisplay = document.getElementById("org-temp-display");

    const col1 = document.getElementById("col-1");
    const col2 = document.getElementById("col-2");
    const col3 = document.getElementById("col-3");

    if (!modal) return;

    // 選択状態管理
    let selection = { l1: null, l2: null, l3: null };

    // リセット & 再描画
    function render() {
        // Col 1 Render
        col1.innerHTML = "";
        orgStructure.forEach(item => {
            const el = createItem(item, selection.l1?.id === item.id, () => {
                selection.l1 = item;
                selection.l2 = null;
                selection.l3 = null;
                render();
            });
            col1.appendChild(el);
        });

        // Col 2 Render
        col2.innerHTML = "";
        if (selection.l1) {
            selection.l1.children.forEach(item => {
                const el = createItem(item, selection.l2?.id === item.id, () => {
                    selection.l2 = item;
                    selection.l3 = null;
                    render();
                });
                col2.appendChild(el);
            });
        } else {
            col2.innerHTML = `<div class="text-gray-400 text-sm p-4 text-center">左の項目を選択してください</div>`;
        }

        // Col 3 Render
        col3.innerHTML = "";
        if (selection.l2) {
            selection.l2.children.forEach(item => {
                const el = createItem(item, selection.l3?.id === item.id, () => {
                    selection.l3 = item;
                    render();
                });
                col3.appendChild(el);
            });
        } else {
            const msg = selection.l1 ? "中央の項目を選択してください" : "左の項目を選択してください";
            col3.innerHTML = `<div class="text-gray-400 text-sm p-4 text-center">${msg}</div>`;
        }

        updateStatus();
    }

    function createItem(item, isSelected, onClick) {
        const div = document.createElement("button");
        div.type = "button";
        div.className = `w-full text-left px-3 py-2.5 rounded-lg text-sm mb-1 transition-all flex justify-between items-center ${
            isSelected 
            ? "bg-sky-600 text-white font-bold shadow-md ring-2 ring-sky-200" 
            : "hover:bg-gray-100 text-gray-700"
        }`;
        
        const spanName = document.createElement("span");
        spanName.textContent = item.name;
        div.appendChild(spanName);

        // 子階層がある場合は矢印を表示
        if (item.children) {
            const arrow = document.createElement("span");
            arrow.className = "material-symbols-outlined text-[16px]";
            arrow.textContent = "chevron_right";
            div.appendChild(arrow);
        }

        div.addEventListener("click", onClick);
        return div;
    }

    function updateStatus() {
        const parts = [];
        if (selection.l1) parts.push(selection.l1.name);
        if (selection.l2) parts.push(selection.l2.name);
        if (selection.l3) parts.push(selection.l3.name);
        
        if (parts.length > 0) {
            tempDisplay.textContent = parts.join(" > ");
            // 第3階層まで選ばれていれば決定ボタン有効化
            confirmBtn.disabled = !selection.l3; 
        } else {
            tempDisplay.textContent = "未選択";
            confirmBtn.disabled = true;
        }
    }

    // イベント設定
    openInput.addEventListener("click", () => {
        modal.classList.remove("hidden");
        render();
    });

    closeBtns.forEach(btn => btn?.addEventListener("click", () => modal.classList.add("hidden")));

    confirmBtn.addEventListener("click", () => {
        if (selection.l1 && selection.l2 && selection.l3) {
            const fullName = `${selection.l1.name} / ${selection.l2.name} / ${selection.l3.name}`;
            openInput.value = fullName;
            hiddenInput.value = selection.l3.id; // IDを送信
            
            // バリデーション実行
            touchedFields.add("org_display");
            validate(false);

            modal.classList.add("hidden");
        }
    });

    // 初期化
    render();
}

// ---- Init
document.addEventListener("DOMContentLoaded", () => {
    bindCart();
    recalcTotals();
    bindOtpLogic();
    bindInputHelpers();
    bindEnrollTypeUI();
    bindPrivacyModal();
    bindOrgPicker();

    // 全入力フィールドに対し、Blur(フォーカス外れ)で「触った」とマークする
    document.querySelectorAll("input, select").forEach(el => {
        // Blur時: touchedに追加して検証
        el.addEventListener("blur", () => {
            touchedFields.add(el.id);
            validate(false);
        });
        // Input時: 即座に検証（エラー解消のため）。ただしtouchedには追加しない。
        el.addEventListener("input", () => {
            validate(false);
        });
    });

    // 送信ボタン
    const placeBtn = document.getElementById("place-order");
    if (placeBtn) {
        placeBtn.addEventListener("click", (e) => {
            e.preventDefault();
            // 送信時はフラグをtrueにして強制的に全フィールド赤くする
            if (validate(true)) {
                alert("注文内容を送信しました。（デモ）");
            }
        });
    }
});