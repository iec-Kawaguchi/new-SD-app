window.addEventListener('pageshow', function (event) {
	if (event.persisted) {
		window.location.reload();
	}
});

window.addEventListener('DOMContentLoaded', (event) => {
	init_head_menu();
});

window.addEventListener('load', (event) => {
	init_btn_toggle();
	init_form();
});


/** --------------------------------------------------
 * ヘッダー
 ** --------------------------------------------------*/
function init_head_menu() {
	const bt = document.querySelector('.header--nav--toggle-button a');
	if (bt) {
		bt.addEventListener('click', function (event) {
			event.preventDefault();
			const obj = document.body;
			obj.classList.toggle('menu-open');
		});
	}

	//ページスクロールに応じてヘッダーの表示を切り替える
	const header = document.querySelector('header');
	if (header) {
		//ページを下向きにスクロールした際にヘッダーを隠す
		let scrollPos = 0;
		window.addEventListener('scroll', function () {
			//ヘッダー高さ
			const header_height = header.clientHeight;
			//メニューが開いている状態の時は処理をしない
			if (document.body.classList.contains('menu-open')) return;
			const currentPos = window.pageYOffset;
			if (currentPos - scrollPos > 0) {
				//下にスクロール中
				//スクロール位置が最上部から10px未満ならヘッダーを表示
				if (currentPos < header_height) {
					header.classList.remove('hide');
				} else {
					header.classList.add('hide');
				}
			} else {
				//上にスクロール中
				header.classList.remove('hide');
			}
			scrollPos = currentPos;
		});
	}
	//ウインドウが769px以上の場合はmenu-openクラスを削除
	window.addEventListener('resize', function () {
		const w_width = window.innerWidth;
		if (w_width >= 769) {
			document.body.classList.remove('menu-open');
			header.classList.remove('hide');
		}
	});
}


/** --------------------------------------------------
 * Form
 ** --------------------------------------------------*/
function init_form() {
	//formが存在しなければ終了
	const form = document.querySelector('#form--search');
	if (!form) return;

	//modal
	const btn_filter = document.querySelector('.__btn.__filter');
	if (btn_filter) {
		init_modal();
		btn_filter.addEventListener('click', function (event) {
			event.preventDefault();
			open_modal(this);
		});
		//test
		// open_modal(btn_filter);
	}

	//modal（TOP KV）
	const searchtriggers = document.querySelectorAll('.__searchtrigger');
	searchtriggers.forEach((searchtrigger, index) => {
		init_modal();
		searchtrigger.addEventListener('click', (event) => {
			event.preventDefault();
			// イベントが発生した自身のタグを参照
			const currentTarget = event.currentTarget;
			open_modal(currentTarget);
		});
	});

	//ウィンドウサイズに応じてplaceholderのテキストを変更
	const placeholder = document.querySelectorAll('input[data-sp]');
	if (placeholder) {
		placeholder.forEach((obj) => {
			const text = obj.getAttribute('placeholder');
			obj.setAttribute('data-pc', text);
		});
	}
	//resize
	window.addEventListener('resize', function () {
		update_form();
	});
	update_form();
}
function update_form() {
	const w_width = window.innerWidth;
	let win_mode = '';
	if (w_width < 768) {
		win_mode = 'sp';
	} else {
		win_mode = 'pc';
	}

	//placeholderのテキストを変更
	const placeholder = document.querySelectorAll('input[data-sp]');
	if (placeholder) {
		placeholder.forEach((obj) => {
			const text = obj.getAttribute('data-' + win_mode);
			const ph = obj.getAttribute('placeholder');
			if (text != ph)
				obj.setAttribute('placeholder', text);
		});
	}
}

/** --------------------------------------------------
 * Modal
 ** --------------------------------------------------*/
function open_modal(obj) {
	const id = obj.getAttribute('data-target');
	const body = document.querySelector("body");
	const target = document.querySelector("#" + id);
	if (target) {
		body.classList.add('modal--open');
		target.classList.add('modal--active');
	}
}
function close_modal() {
	const body = document.querySelector("body");
	body.classList.remove('modal--open');

	const modal = document.querySelectorAll('.modal--active');
	if (modal) {
		modal.forEach((obj) => {
			obj.classList.remove('modal--active');
		});
	}
}

function init_modal() {
	//プロパティdata-modal_closerを持つ要素をクリックしたらモーダルを閉じる
	const closer = document.querySelectorAll('[data-modal_closer]');
	if (closer) {
		closer.forEach((obj) => {
			obj.addEventListener('click', function (event) {
				event.preventDefault();
				close_modal();
			});
		});
	}
	//.modal articleをクリックしてもモーダルを閉じないようにする
	const modal = document.querySelectorAll('.modal article');
	if (modal) {
		modal.forEach((obj) => {
			obj.addEventListener('click', function (event) {
				event.stopPropagation();
			});
		});
	}
}


/** --------------------------------------------------
 * ボタンによる表示切り替え
 ** --------------------------------------------------*/
function init_btn_toggle() {
	//もっと見る
	const btns = document.querySelectorAll('.btn__toggle');
	if (btns) {
		btns.forEach((btn) => {
			btn.addEventListener('click', function (event) {
				event.preventDefault();
				update_btn_toggle(btn);
			});
		});
	}
	//プラン概要
	const btns_plan = document.querySelectorAll('.link__plan');
	if (btns_plan) {
		btns_plan.forEach((btn, i) => {
			//console.log(i);
			init_btn_toggle__plan(btn, i + 1);
		});
		//１つ目のプランを表示
		show_toggle__plan(2);
	}
}

//もっとみる制御
function update_btn_toggle(btn) {
	const target = btn.getAttribute('data-target');
	const cnt = document.querySelector(target);
	const btn_open = document.querySelector('.btn__toggle.__is_open[data-target="' + target + '"]');
	const btn_close = document.querySelector('.btn__toggle.__is_close[data-target="' + target + '"]');

	//コンテンツの表示切り替え
	const e = btn.classList.contains('__is_open');
	// console.log(e);
	// console.log(cnt);
	if (e) {
		cnt.classList.add('show');
		btn_open.classList.add('__hide');
		btn_close.classList.remove('__hide');
		//cntの最上部にスクロール
		cnt.scrollIntoView({ behavior: 'smooth', block: 'start' });
	} else {
		cnt.classList.remove('show');
		btn_open.classList.remove('__hide');
		btn_close.classList.remoaddve('__hide');
		//btn_closeの最上部にスクロール
		btn_close.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}


	// const target = btn.getAttribute('data-target');
	// //data-target に tarfet が指定されているbtn__toggleを探す
	// const btns = document.querySelectorAll('.btn__toggle[data-target="' + target + '"]');
	// if (btns) {
	// 	btns.forEach((obj) => {
	// 		if (obj != btn) {
	// 			console.log(obj);
	// 			obj.classList.remove('is__open');
	// 		}
	// 	});
	// }
	// const obj = document.querySelector(target);
	// if (btn.classList.contains('is__open')) {
	// 	obj.classList.add('show');
	// } else {
	// 	obj.classList.remove('show');
	// }
}

//プラン表示制御: 初期化
function init_btn_toggle__plan(btn, n) {
	btn.setAttribute('data-rel', n);
	//btnの親要素を取得（最初のdivを見つけるまで遡る）
	let parent = btn.parentNode;
	while (parent) {
		if (parent.tagName == 'DIV') break;
		parent = parent.parentNode;
	}
	if (!parent) return;
	//表示切り替え対象用のフラグを追加
	parent.classList.add('l--plan_toggle');
	parent.setAttribute('data-rel', n);
	//クリックイベント
	btn.addEventListener('click', function (event) {
		event.preventDefault();
		const n = btn.getAttribute('data-rel');
		if (!n) return;
		//console.log(n);
		show_toggle__plan(n);
	});
}
//プラン表示制御: 表示
function show_toggle__plan(n) {
	const target = document.querySelectorAll('.l--plan_toggle');
	if (target) {
		target.forEach((obj) => {
			const rel = obj.getAttribute('data-rel');
			if (rel == n) {
				obj.classList.remove('show');
			} else {
				obj.classList.add('show');
			}
		});

		update_input_toggle__plan();
	}
}

//プラン表示切替時: input hidden更新（2024.06.16 追記）
function update_input_toggle__plan() {
	const target = document.querySelector('.l--plan_toggle.show');
	//console.log(target);
	if (target) {
		const plan_name = document.querySelector('.plan_name');
		const plan_period1 = document.querySelector('.plan_period1');
		const plan_period2 = document.querySelector('.plan_period2');
		if (plan_name) {
			plan_name.value = target.dataset.name;
		}
		if (plan_period1) {
			plan_period1.value = target.dataset.price1;
		}
		if (plan_period2) {
			plan_period2.value = target.dataset.price2;
		}
	}
}


/** --------------------------------------------------
 * Anchor Scroll
 ** --------------------------------------------------*/
const smoothScrollTrigger = document.querySelectorAll('a[href^="#"]:not([href="#"])');
for (let i = 0; i < smoothScrollTrigger.length; i++) {
	smoothScrollTrigger[i].addEventListener('click', (e) => {
		e.preventDefault();
		let href = smoothScrollTrigger[i].getAttribute('href');
		let targetElement = document.getElementById(href.replace('#', ''));
		if (targetElement) {
			const rect = targetElement.getBoundingClientRect().top;
			const offset = window.pageYOffset;
			const gap = document.querySelector('header').clientHeight;
			const target = rect + offset - gap;

			window.scrollTo({
				top: target,
				behavior: 'smooth',
			});
		}
	});
}

//is number
const isNumber = function (value) {
	return ((typeof value === 'number') && (isFinite(value)));
};



// 受講するボタン 送信
function cv_submit() {
	document.cv_form.submit();
}

/** --------------------------------------------------
 * Go to pagetop
 ** --------------------------------------------------*/
const gototop = document.querySelectorAll('.footer--totop');
if (gototop) {
	gototop.forEach((btn, i) => {
		btn.addEventListener('click', (e) => {
			e.preventDefault();
			window.scroll({
				top: 0,
				behavior: 'smooth'
			})
		});
	});
}