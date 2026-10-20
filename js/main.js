(function () {
  "use strict";

  // LINEアプリのストアリンクを端末に応じて設定
  // iOS: App Store / Android: Google Play / その他: LINE公式サイト
  const lineStoreUrls = {
    ios: "https://apps.apple.com/jp/app/line/id443904275",
    android: "https://play.google.com/store/apps/details?id=jp.naver.line.android&hl=ja",
    other: "https://www.line.me/ja/"
  };
  const userAgent = navigator.userAgent || "";
  let lineStoreUrl = lineStoreUrls.other;

  if (/iPhone|iPad|iPod/i.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    lineStoreUrl = lineStoreUrls.ios;
  } else if (/Android/i.test(userAgent)) {
    lineStoreUrl = lineStoreUrls.android;
  }

  document.querySelectorAll(".line-lk").forEach(function (link) {
    link.href = lineStoreUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });

  // ここをGAS Web Appの公開URLに差し替えてください
  const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbxoobeBRsqqS9cg5S5JMF8FNvvFUFxCb-hlme31P6G_4ZZU_Ar_uSdLT7aECpJTvws/exec";

  // 各トーク／ライブの開催日と、イベント予約欄に出す情報
  const EVENTS = {
    "2026-01-11": { title: "「AFTER IMAGE と、10年のキュレーション」", time: "17:00–18:15", tag: "要予約" },
    "2026-01-17": { title: "「記憶・物質・イメージの残り方」", time: "18:00–19:00", tag: "要予約" },
    "2026-01-18": { title: "「AFTER IMAGE / Light Trace」", time: "18:30–19:10", tag: "要予約" },
    "2026-01-24": { title: "「若手作家が語る“AFTER IMAGE”」", time: "16:00–17:00", tag: "予約推奨" },
  };

  const visitDateInput = document.getElementById("visitDate");
  const visitDateError = document.getElementById("visitDateError");
  const changeVisitDateInput = document.getElementById("changeVisitDate");
  const changeVisitDateError = document.getElementById("changeVisitDateError");

  // 会期外の日付と火曜日（定休日）を、選択変更時と送信前に検証する。
  // iOS Safariの標準日付ピッカーは min/max の外側を表示・選択できる場合があるため、
  // HTML属性だけに依存せずJavaScriptでも拒否する。
  function isTuesday(dateValue) {
    if (!dateValue) return false;
    const parts = dateValue.split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return false;
    return new Date(parts[0], parts[1] - 1, parts[2]).getDay() === 2;
  }

  function validateVisitDate(input, errorElement) {
    const value = input.value;
    const outsidePeriod = !!value && ((input.min && value < input.min) || (input.max && value > input.max));
    const closed = !!value && isTuesday(value);
    let message = "";
    if (outsidePeriod) {
      message = `来場日は会期内（${input.min}〜${input.max}）の日付をお選びください。`;
    } else if (closed) {
      message = "火曜日は定休日のため選択できません。別の日付をお選びください。";
    }
    input.setCustomValidity(message);
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.hidden = !message;
    }
    return !message;
  }

  const eventField = document.getElementById("eventField");
  const eventLabel = document.getElementById("eventLabel");
  const eventHint = document.getElementById("eventHint");

  // ---------------------------------------------------------
  // 1. イベント予約欄の条件分岐表示（来場日に応じて自動で出し分け）
  // ---------------------------------------------------------
  function syncEventField() {
    const date = visitDateInput.value;
    const ev = EVENTS[date];
    if (ev) {
      eventLabel.textContent = `このイベントにも参加しますか？（${ev.tag}）`;
      eventHint.textContent = `${ev.title}｜${ev.time}`;
      eventField.hidden = false;
    } else {
      eventField.hidden = true;
    }
  }
  visitDateInput.addEventListener("change", function () {
    validateVisitDate(visitDateInput, visitDateError);
    syncEventField();
  });
  visitDateInput.addEventListener("input", function () {
    validateVisitDate(visitDateInput, visitDateError);
  });
  if (changeVisitDateInput) {
    changeVisitDateInput.addEventListener("change", function () {
      validateVisitDate(changeVisitDateInput, changeVisitDateError);
    });
    changeVisitDateInput.addEventListener("input", function () {
      validateVisitDate(changeVisitDateInput, changeVisitDateError);
    });
  }

  // ---------------------------------------------------------
  // 2. SCHEDULEセクションの「この回を予約する」リンク
  //    → フォームへスクロール ＋ 来場日を自動入力
  // ---------------------------------------------------------
  document.querySelectorAll(".ev-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      const date = link.getAttribute("data-date");
      if (date) {
        visitDateInput.value = date;
        visitDateInput.dispatchEvent(new Event("change"));
      }
      // ブラウザ標準のアンカー遷移（href="#reserve-form"）に任せる。
      // html { scroll-behavior: smooth } によりスムーズスクロールされる。
    });
  });

  // ---------------------------------------------------------
  // 3. 固定バー：予約フォームセクションに入ったら非表示
  // ---------------------------------------------------------
  const fixedbar = document.getElementById("fixedbar");
  const formSection = document.getElementById("reserve-form") || document.querySelector(".form-section");

  if (fixedbar && formSection && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          fixedbar.classList.toggle("is-hidden", entry.isIntersecting);
        });
      },
      { threshold: 0, rootMargin: "0px 0px -40% 0px" }
    );
    observer.observe(formSection);
  }

  // ---------------------------------------------------------
  // 4. 予約フォームの送信処理とエラーハンドリング
  // ---------------------------------------------------------
 
const form = document.getElementById("reserveForm"); 
const submitBtn = document.getElementById("submitBtn"); 
const formError = document.getElementById("formError"); 
const formSuccess = document.getElementById("formSuccess"); 

// 予約番号表示用 
const reservationNumber = 
document.getElementById("reservationNumber"); 

// GAS通信のタイムアウト 
const TIMEOUT_MS = 10000; 

// =========================================================
// 電話番号バリデーション（日本国内の固定電話・携帯電話）
// ハイフンは任意。数字のみで10〜11桁を許可する。
// =========================================================
const telInput = document.getElementById("tel");
if (telInput) {
  const validateTel = () => {
    const value = telInput.value.trim();
    telInput.setCustomValidity("");
    if (!value) return; // 必須チェックはHTMLのrequiredに任せる

    if (!/^[0-9-]+$/.test(value)) {
      telInput.setCustomValidity("電話番号は半角数字とハイフンで入力してください。");
      return;
    }

    const digits = value.replace(/-/g, "");
    if (!/^\d{10,11}$/.test(digits)) {
      telInput.setCustomValidity("電話番号はハイフンを除いて10〜11桁で入力してください。");
    }
  };

  telInput.addEventListener("input", validateTel);
  telInput.addEventListener("blur", validateTel);
}
 
// =========================================================  
// エラー表示 
// ========================================================= 
function showError(message) { 
  formError.innerHTML = 
   message + 
   ' 解決しない場合は <a href="mailto:info@gallery-dot.jp" class="inline-lk">info@gallery-dot.jp</a> までご連絡ください。'; 
   formError.hidden = false; 
   formSuccess.hidden = true; 
  
  } 
  
  
  // ========================================================= 
  // 成功表示  
  // GASから返された予約番号を表示 
  // ========================================================= 
  function showSuccess(reservationId) { 
    if (reservationNumber) { 
      reservationNumber.textContent = reservationId; 
  } 
  
  formSuccess.hidden = false; 
  formError.hidden = true; 
} 


// ========================================================= 
// 送信中／通常状態の切り替え 
// ========================================================= 
function setSubmitting(isSubmitting) { 
  submitBtn.disabled = isSubmitting; 
  
  submitBtn.textContent = isSubmitting 
  ? "送信中…" 
  : "予約を送信する"; 
} 


// ========================================================= 
// 予約フォーム送信 
// ========================================================= 
form.addEventListener("submit", async (e) => { 
  e.preventDefault(); 
  
  // 以前のメッセージを非表示 
  formError.hidden = true; 
  formSuccess.hidden = true; 
  
  
  // ------------------------------------------------------- 
  // 会期外の日付・定休日チェック
  if (!validateVisitDate(visitDateInput, visitDateError)) {
    visitDateInput.reportValidity();
    visitDateInput.focus();
    return;
  }

  // HTML側のrequired等をチェック 
  // ------------------------------------------------------- 
  if (!form.checkValidity()) { 
    form.reportValidity(); 
    return; 
  } 
  
  
  // ------------------------------------------------------- 
  // 送信中表示 
  // ------------------------------------------------------- 
   setSubmitting(true); 
  
  
  // ------------------------------------------------------- 
  // GASへ送信するデータ 
  // ------------------------------------------------------- 
  const payload = { 
    name: document.getElementById("name").value.trim(), 
    email: form.email.value.trim(), 
    tel: form.tel.value.trim(), 
    visitDate: form.visitDate.value, 
    visitTime: form.visitTime.value, 
    companions: form.companions.value, 
    
    // イベント対象日だけ値を送る 
    eventJoin: eventField.hidden 
     ? null 
     : form.eventJoin.value, 
     
     // LINE登録希望 
     lineOptIn: form.lineOptIn.checked, 
      
     // 利用規約・プライバシーポリシー同意 
    agree: form.agree.checked 
     }; 
     
     
     // ------------------------------------------------------- 
     // GAS通信タイムアウト設定 
     // ------------------------------------------------------- 
    const controller = new AbortController(); 
    
    const timeoutId = setTimeout( 
      () => controller.abort(), 
      TIMEOUT_MS 
    ); 
    
    try { 
      // ----------------------------------------------------- 
      // GASへPOST 
      // ----------------------------------------------------- 
      const res = await fetch(GAS_ENDPOINT, { 
        method: "POST", 
        
        headers: { 
          "Content-Type": "text/plain;charset=utf-8" 
        }, 
        
        body: JSON.stringify(payload), 
        signal: controller.signal }); 
        
        clearTimeout(timeoutId); 
        
        
        // ----------------------------------------------------- 
        // HTTP通信自体が失敗した場合 
        // ----------------------------------------------------- 
         if (!res.ok) { 
          throw new Error("bad status"); 
        } 
        
        
        // ----------------------------------------------------- 
        // GASから返されたJSONを取得
        // 
        // 例： 
        // { 
        // "success": true, 
        // "reservationId": "DOT-20261005-123456" // } 
        // ----------------------------------------------------- 
        const result = await res.json(); 
        
        
        // ----------------------------------------------------- 
        // GAS側の予約処理が失敗した場合 
        // ----------------------------------------------------- 
        if (!result.success) { 
          throw new Error( 
            result.error || "reservation failed" 
          ); 
        } 
        
        
        // ----------------------------------------------------- 
        // 予約成功  
        // GASから返された予約番号を表示  
        // ----------------------------------------------------- 
         
        showSuccess(result.reservationId); 
        

        // ----------------------------------------------------- 
        // フォームを初期状態へ戻す 
        // ----------------------
        form.reset(); 
        
        eventField.hidden = true; 
      
      } catch (err) { 
        
        clearTimeout(timeoutId); 
        
        console.error(err); 
        
        
        // ----------------------------------------------------- /
        // エラー表示 
        // ----------------------------------------------------- 
        showError( 
          "予約処理に失敗しました。通信状況をご確認のうえ、もう一度お試しください。" 
        
        ); 
      
      } finally { 
        
        // ----------------------------------------------------- 
        // 送信ボタンを通常状態へ戻す 
        // ----------------------------------------------------- 
        setSubmitting(false);
       } 
      });

  // ---------------------------------------------------------
  // 5. 予約変更フォーム
  //    予約番号＋予約時メールアドレスで本人確認し、日付・時間帯を送信
  // ---------------------------------------------------------
  const changeForm = document.getElementById("changeReservationForm");
  const changeSubmitBtn = document.getElementById("changeSubmitBtn");
  const changeFormError = document.getElementById("changeFormError");
  const changeFormSuccess = document.getElementById("changeFormSuccess");
  const changeReservationNumber = document.getElementById("changeReservationNumber");

  function showChangeError(message) {
    changeFormError.textContent = message;
    changeFormError.hidden = false;
    changeFormSuccess.hidden = true;
  }

  changeForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    changeFormError.hidden = true;
    changeFormSuccess.hidden = true;
    const oldWarning = changeFormSuccess.querySelector(".change-notification-warning");
    if (oldWarning) oldWarning.remove();

    if (!validateVisitDate(changeVisitDateInput, changeVisitDateError)) {
      changeVisitDateInput.reportValidity();
      changeVisitDateInput.focus();
      return;
    }

    if (!changeForm.checkValidity()) {
      changeForm.reportValidity();
      return;
    }

    changeSubmitBtn.disabled = true;
    changeSubmitBtn.textContent = "変更処理中…";

    const payload = {
      action: "change",
      reservationId: changeForm.reservationId.value.trim(),
      email: changeForm.email.value.trim(),
      visitDate: changeForm.visitDate.value,
      visitTime: changeForm.visitTime.value
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(GAS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error("bad status");

      const result = await res.json();
      if (!result.success) throw new Error(result.error || "change failed");

      changeReservationNumber.textContent = result.reservationId || payload.reservationId;
      changeFormSuccess.hidden = false;
      changeFormError.hidden = true;
      if (result.notificationWarning) {
        const warning = document.createElement("p");
        warning.className = "change-notification-warning";
        warning.textContent = result.notificationWarning;
        changeFormSuccess.appendChild(warning);
      }
      changeForm.reset();
    } catch (err) {
      clearTimeout(timeoutId);
      console.error(err);
      showChangeError(err.message && err.message !== "change failed"
        ? err.message
        : "予約変更に失敗しました。予約番号とメールアドレスをご確認ください。解決しない場合は info@gallery-dot.jp までご連絡ください。");
    } finally {
      changeSubmitBtn.disabled = false;
      changeSubmitBtn.textContent = "予約内容を変更する";
    }
  });
    

  // ---------------------------------------------------------
  // LPアニメーション：セクション表示／折原柚衣作品のスライド
  // ---------------------------------------------------------
  const reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // セクションを画面内に入ったタイミングで表示。一度表示したらそのまま維持。
  const revealTargets = document.querySelectorAll(".s, .fin");
  if (!reduceMotion && "IntersectionObserver" in window) {
    document.documentElement.classList.add("has-scroll-animations");
  }
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealTargets.forEach(function (section) { section.classList.add("is-visible"); });
  } else {
    const revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -30px 0px" });
    revealTargets.forEach(function (section) { revealObserver.observe(section); });
  }

  // 折原さんの横長画像は、縦長の表示枠内で左右を交互に表示。
  // 画像の切り替えに合わせて作品説明も同時に切り替える。
  const oriharaFigure = document.querySelector(".w-orihara");
  if (oriharaFigure) {
    const captionItems = Array.from(oriharaFigure.querySelectorAll(".orihara-caption-item"));
    let showingRight = false;
    let oriharaTimer = null;
    function showOriharaWork(showRight) {
      showingRight = showRight;
      oriharaFigure.classList.toggle("is-showing-right", showingRight);
      captionItems.forEach(function (caption, index) {
        caption.classList.toggle("is-active", index === (showingRight ? 1 : 0));
      });
      const image = oriharaFigure.querySelector(".orihara-pan");
      if (image) image.alt = showingRight ? "折原柚衣《Blind Spot》" : "折原柚衣《Afterglow #07》";
    }
    if (captionItems.length > 1 && !reduceMotion) {
      // 最初の作品を約4.5秒表示し、以降は左右を交互に切り替える。
      oriharaTimer = window.setInterval(function () { showOriharaWork(!showingRight); }, 4500);
    }
    // タブが非表示の間はタイマーを止め、戻った際に表示時間をリセットする。
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        if (oriharaTimer) window.clearInterval(oriharaTimer);
        oriharaTimer = null;
      } else if (captionItems.length > 1 && !reduceMotion && !oriharaTimer) {
        showOriharaWork(false);
        oriharaTimer = window.setInterval(function () { showOriharaWork(!showingRight); }, 4500);
      }
    });
  }

})();