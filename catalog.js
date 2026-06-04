/* ============================================================
   ARKHIVEZ STORE — catalog.js  (Fixed & Enhanced)
   ============================================================ */

const CART_KEY     = 'arkhivez_cart';
const WISHLIST_KEY = 'arkhivez_wishlist';

/* ============================================================
   1. INIT
   ============================================================ */
(function init() {
  const session = window.ArkhivezAuth.requireAuth('customer');
  if (!session) return;

  const userNameEl = document.getElementById('userName');
  if (userNameEl) userNameEl.textContent = session.name;

  initHistoryUI();
  initCheckoutUI();
  initHeader();
  initMobileNav();
  renderAllProductGrids();
  initCartUI();
  initFilterChips();
  initPriceFilter();
  initLiveSearch();

  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) btnLogout.addEventListener('click', handleLogout);
})();

/* ============================================================
   2. HEADER
   ============================================================ */
function initHeader() {
  const header = document.getElementById('siteHeader');
  if (!header) return;
  window.addEventListener('scroll', function () {
    header.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });
}

/* ============================================================
   3. MOBILE NAV
   ============================================================ */
function initMobileNav() {
  const hamburger  = document.getElementById('hamburger');
  const siteNav    = document.getElementById('siteNav');
  const navOverlay = document.getElementById('navOverlay');
  if (!hamburger || !siteNav) return;

  function openNav() {
    hamburger.classList.add('open');
    siteNav.classList.add('open');
    if (navOverlay) { navOverlay.classList.add('visible'); navOverlay.style.display = 'block'; }
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeNav() {
    hamburger.classList.remove('open');
    siteNav.classList.remove('open');
    if (navOverlay) { navOverlay.classList.remove('visible'); setTimeout(() => { navOverlay.style.display = ''; }, 250); }
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', () => hamburger.classList.contains('open') ? closeNav() : openNav());
  if (navOverlay) navOverlay.addEventListener('click', closeNav);
  siteNav.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', closeNav));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });
}

/* ============================================================
   4. RENDER PRODUK
   ============================================================ */
async function renderAllProductGrids(maxPrice) {
  await renderProductGrid('productGridPakaian',   'pakaian',   'all', maxPrice);
  await renderProductGrid('productGridAksesoris', 'aksesoris', 'all', maxPrice);
}

async function renderProductGrid(gridId, category, subCategory, maxPrice = Infinity) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  let products = await window.ArkhivezProducts.getByCategory(category, subCategory);
  products = products.filter(p => p.price <= maxPrice);

  grid.innerHTML = '';

  if (products.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;opacity:.5;">
      <p style="font-size:2rem">🔍</p><p>Tidak ada produk yang sesuai.</p></div>`;
    return;
  }

  products.forEach((product, index) => grid.appendChild(createProductCard(product, index)));
}

/* ── Card Produk (class names sesuai style.css) ── */
function createProductCard(product, index) {
  const card = document.createElement('div');
  card.className = 'product-card';
  card.setAttribute('data-product-id', product.id);
  if (typeof index === 'number') card.style.animationDelay = `${index * 0.07}s`;

  let wishlist = [];
  try { wishlist = JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]'); } catch(e) {}
  const isWishlisted = wishlist.includes(product.id);

  const mainImg  = product.image     || `https://picsum.photos/seed/${product.id}/400/530`;
  const hoverImg = product.imageHover || mainImg;
  const fmt      = window.ArkhivezProducts.formatRupiah;
  const discount = product.priceOri > product.price
    ? Math.round(((product.priceOri - product.price) / product.priceOri) * 100)
    : 0;

  card.innerHTML = `
    <div class="product-card__img-wrap">
      <img class="product-card__img main-img"
           src="${mainImg}" alt="${product.name}" loading="lazy"
           onerror="this.onerror=null;this.src='https://picsum.photos/seed/${product.id}/400/530'">
      <img class="product-card__img hover-img"
           src="${hoverImg}" alt="${product.name}" loading="lazy"
           onerror="this.onerror=null;this.src='https://picsum.photos/seed/${product.id}/400/530'">
      ${product.badge ? `<span class="product-card__badge badge--${product.badge}">${product.badge.toUpperCase()}</span>` : ''}
      ${discount >= 5 ? `<span class="product-card__discount">-${discount}%</span>` : ''}
      <button class="product-card__wishlist ${isWishlisted ? 'wishlisted' : ''}"
              onclick="event.stopPropagation(); window.toggleWishlist('${product.id}')"
              aria-label="${isWishlisted ? 'Hapus dari' : 'Tambah ke'} wishlist">
        <svg width="16" height="16" viewBox="0 0 24 24"
             fill="${isWishlisted ? 'var(--color-gold)' : 'none'}"
             stroke="${isWishlisted ? 'var(--color-gold)' : 'currentColor'}" stroke-width="1.8">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
    </div>

    <div class="product-card__info">
      <div class="product-card__brand">${product.brand || 'ARKHIVEZ'}</div>
      <h4 class="product-card__name">${product.name}</h4>
      ${product.fitType ? `<span class="product-card__fit-tag">${product.fitType}</span>` : ''}
      ${product.sizes && product.sizes.length > 0 && product.category === 'pakaian'
        ? `<div class="product-card__sizes">${product.sizes.map(s => `<span class="size-chip">${s}</span>`).join('')}</div>`
        : ''}
      <div class="product-card__price-row">
        <span class="product-card__price">${fmt(product.price)}</span>
        ${product.priceOri > product.price ? `<span class="product-card__price-original">${fmt(product.priceOri)}</span>` : ''}
      </div>
      ${product.stock > 0 && product.stock <= 5 ? `<p class="product-card__stock-warn">Sisa ${product.stock} item!</p>` : ''}
    </div>

    <button class="product-card__btn ${product.stock === 0 ? 'product-card__btn--sold' : ''}"
            onclick="window.addToCart('${product.id}')"
            ${product.stock === 0 ? 'disabled' : ''}>
      ${product.stock === 0 ? 'Habis Terjual' : '+ Tambah Keranjang'}
    </button>
  `;

  card.addEventListener('click', function(e) {
    if (!e.target.closest('button')) window.openQuickView(product.id);
  });

  return card;
}

/* ============================================================
   5. FILTER CHIPS
   ============================================================ */
function initFilterChips() {
  document.querySelectorAll('.filter-chips').forEach(group => {
    group.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', function() {
        const section = this.dataset.section;
        const filter  = this.dataset.filter;
        group.querySelectorAll('.chip').forEach(c => c.classList.remove('chip--active'));
        this.classList.add('chip--active');
        const gridId = section === 'pakaian' ? 'productGridPakaian' : 'productGridAksesoris';
        const grid   = document.getElementById(gridId);
        if (grid) {
          grid.style.opacity = '0'; grid.style.transform = 'translateY(8px)';
          grid.style.transition = 'opacity 0.2s, transform 0.2s';
          setTimeout(() => {
            renderProductGrid(gridId, section, filter);
            grid.style.opacity = '1'; grid.style.transform = 'translateY(0)';
          }, 200);
        }
      });
    });
  });
}

/* ============================================================
   6. PRICE FILTER
   ============================================================ */
function initPriceFilter() {
  const slider = document.getElementById('priceRange');
  const label  = document.getElementById('priceValue');
  if (!slider) return;
  slider.addEventListener('input', function() {
    if (label) label.textContent = window.ArkhivezProducts.formatRupiah(this.value);
    renderAllProductGrids(Number(this.value));
  });
}

/* ============================================================
   7. LIVE SEARCH
   ============================================================ */
function initLiveSearch() {
  const input = document.getElementById('productSearch');
  if (!input) return;
  input.addEventListener('input', function() {
    const kw = this.value.toLowerCase().trim();
    document.querySelectorAll('.product-card').forEach(card => {
      const name  = (card.querySelector('.product-card__name')  || {}).textContent || '';
      const brand = (card.querySelector('.product-card__brand') || {}).textContent || '';
      card.style.display = (!kw || name.toLowerCase().includes(kw) || brand.toLowerCase().includes(kw)) ? '' : 'none';
    });
  });
}

/* ============================================================
   8. CART
   ============================================================ */
function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch(e) { return []; }
}
function saveCart(cart) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch(e) {}
}

async function addToCart(productId) {
  const product  = await window.ArkhivezProducts.getById(productId);
  if (!product) return;
  const cart     = loadCart();
  const existing = cart.find(i => i.id === productId);
  if (existing) {
    if (existing.qty >= product.stock) { showToast(`⚠️ Stok hanya ${product.stock} item`); return; }
    existing.qty += 1;
  } else {
    cart.push({ id: product.id, name: product.name, brand: product.brand, price: product.price, image: product.image, qty: 1 });
  }
  saveCart(cart); updateCartBadge(); renderCartItems();
  showToast(`✓ ${product.name} ditambahkan`);
}

async function changeQty(productId, delta) {
  const cart    = loadCart();
  const product = await window.ArkhivezProducts.getById(productId);
  const item    = cart.find(i => i.id === productId);
  if (!item) return;
  const newQty  = item.qty + delta;
  if (newQty < 1) { removeFromCart(productId); return; }
  if (product && newQty > product.stock) { showToast(`⚠️ Maks stok: ${product.stock}`); return; }
  item.qty = newQty;
  saveCart(cart); updateCartBadge(); renderCartItems();
}

function removeFromCart(productId) {
  saveCart(loadCart().filter(i => i.id !== productId));
  updateCartBadge(); renderCartItems();
  showToast('Item dihapus dari keranjang');
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  const total = loadCart().reduce((s, i) => s + i.qty, 0);
  badge.textContent = total;
  badge.classList.toggle('has-items', total > 0);
  badge.classList.remove('bounce'); void badge.offsetWidth; badge.classList.add('bounce');
}

function updateCartTotal() {
  const el = document.getElementById('cartTotal');
  if (el) el.textContent = window.ArkhivezProducts.formatRupiah(loadCart().reduce((s, i) => s + i.price * i.qty, 0));
}

async function renderCartItems() {
  const el = document.getElementById('cartItems');
  if (!el) return;
  const cart = loadCart();
  updateCartTotal();
  if (!cart.length) {
    el.innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">🛒</div>
      <p>Keranjang masih kosong.</p><small>Yuk mulai belanja!</small></div>`;
    return;
  }
  el.innerHTML = cart.map(item => `
    <div class="cart-item" data-item-id="${item.id}">
      <img class="cart-item__img" src="${item.image}" alt="${item.name}" loading="lazy"
           onerror="this.src='https://picsum.photos/seed/${item.id}/70/90'">
      <div class="cart-item__info">
        <p class="cart-item__name">${item.name}</p>
        <p class="cart-item__price">${window.ArkhivezProducts.formatRupiah(item.price)}</p>
        <div class="cart-item__qty-row">
          <button class="cart-item__qty-btn" onclick="changeQty('${item.id}',-1)">−</button>
          <span class="cart-item__qty">${item.qty}</span>
          <button class="cart-item__qty-btn" onclick="changeQty('${item.id}',1)">+</button>
          <button class="cart-item__remove" onclick="removeFromCart('${item.id}')">Hapus</button>
        </div>
      </div>
    </div>`).join('');
}

function initCartUI() {
  const cartBtn      = document.getElementById('cartBtn');
  const cartModal    = document.getElementById('cartModal');
  const cartClose    = document.getElementById('cartClose');
  const cartBackdrop = document.getElementById('cartBackdrop');
  if (!cartBtn || !cartModal) return;
  updateCartBadge();
  cartBtn.addEventListener('click', () => {
    cartModal.hidden = false; renderCartItems();
    document.body.style.overflow = 'hidden'; if (cartClose) cartClose.focus();
  });
  function closeCart() { cartModal.hidden = true; document.body.style.overflow = ''; cartBtn.focus(); }
  if (cartClose)    cartClose.addEventListener('click', closeCart);
  if (cartBackdrop) cartBackdrop.addEventListener('click', closeCart);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !cartModal.hidden) closeCart(); });
}

/* ============================================================
   9. WISHLIST
   ============================================================ */
window.toggleWishlist = function(id) {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]'); } catch(e) {}
  const idx     = list.indexOf(id);
  const adding  = idx === -1;
  if (adding) { list.push(id); showToast('❤️ Ditambahkan ke wishlist'); }
  else         { list.splice(idx, 1); showToast('Dihapus dari wishlist'); }
  try { localStorage.setItem(WISHLIST_KEY, JSON.stringify(list)); } catch(e) {}

  /* Update tombol wishlist di semua card tanpa re-render penuh */
  document.querySelectorAll(`.product-card[data-product-id="${id}"] .product-card__wishlist`).forEach(btn => {
    btn.classList.toggle('wishlisted', adding);
    const svg = btn.querySelector('svg');
    if (svg) {
      svg.setAttribute('fill',   adding ? 'var(--color-gold)' : 'none');
      svg.setAttribute('stroke', adding ? 'var(--color-gold)' : 'currentColor');
    }
  });

  /* Refresh modal wishlist jika sedang terbuka */
  const wModal = document.getElementById('wishlistModal');
  if (wModal && !wModal.hidden) openWishlistModal();
};

async function openWishlistModal() {
  const modal = document.getElementById('wishlistModal');
  const body  = document.getElementById('wishlistItems');
  if (!modal || !body) return;

  let ids = [];
  try { ids = JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]'); } catch(e) {}

  if (!ids.length) {
    body.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;opacity:.5">
      <p style="font-size:2.5rem">💔</p><p>Wishlist Anda masih kosong.</p></div>`;
  } else {
    body.innerHTML = '';
    for (let _wi = 0; _wi < ids.length; _wi++) {
      const p = await window.ArkhivezProducts.getById(ids[_wi]);
      if (p) body.appendChild(createProductCard(p, _wi));
    }
  }

  modal.hidden = false; document.body.style.overflow = 'hidden';
  const close = document.getElementById('wishlistClose');
  const back  = document.getElementById('wishlistBackdrop');
  function closeWL() { modal.hidden = true; document.body.style.overflow = ''; }
  if (close) close.onclick = closeWL;
  if (back)  back.onclick  = closeWL;
}

/* ============================================================
   10. TOAST
   ============================================================ */
let toastTimer = null;
function showToast(msg, duration = 2500) {
  const t = document.getElementById('toast');
  if (!t) return;
  if (toastTimer) clearTimeout(toastTimer);
  t.textContent = msg; t.classList.add('show');
  toastTimer = setTimeout(() => t.classList.remove('show'), duration);
}

/* ============================================================
   11. LOGOUT
   ============================================================ */
function handleLogout() {
  window.ArkhivezAuth.logout();
  window.location.href = 'login.html';
}

/* ============================================================
   12. RIWAYAT PESANAN
   ============================================================ */
function initHistoryUI() {
  const modal    = document.getElementById('historyModal');
  const close    = document.getElementById('historyClose');
  const backdrop = document.getElementById('historyBackdrop');
  if (!modal) return;
  function closeHistory() { modal.hidden = true; document.body.style.overflow = ''; }
  if (close)    close.addEventListener('click', closeHistory);
  if (backdrop) backdrop.addEventListener('click', closeHistory);
}

async function openHistoryModal() {
  const session = window.ArkhivezAuth.getSession();
  if (!session) return;

  const modal = document.getElementById('historyModal');
  const body  = document.getElementById('historyItems');
  if (!modal || !body) return;

  modal.hidden = false; document.body.style.overflow = 'hidden';

  const allOrders = await window.ArkhivezOrders.getAll();
  /* Match by session.id (number), String(session.id), atau customerName */
  const mine = allOrders.filter(o =>
    String(o.customerId) === String(session.id) ||
    o.customerName === session.name
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (!mine.length) {
    body.innerHTML = `<div style="text-align:center;padding:4rem 1rem;opacity:.6">
      <p style="font-size:3rem">📦</p>
      <p style="font-weight:500;margin-bottom:.25rem">Belum ada pesanan</p>
      <p style="font-size:.85rem">Yuk mulai belanja dan nikmati koleksi ARKHIVEZ!</p>
    </div>`;
    return;
  }

  const statusMap = {
    selesai:    { label: 'SELESAI',    color: '#2e7d32',  bg: '#e8f5e9' },
    diproses:   { label: 'DIPROSES',   color: '#b8860b',  bg: '#fffde7' },
    dikirim:    { label: 'DIKIRIM',    color: '#0277bd',  bg: '#e3f2fd' },
    dibatalkan: { label: 'DIBATALKAN', color: '#c62828',  bg: '#ffebee' },
  };

  const fmt = window.ArkhivezProducts.formatRupiah;
  /* Pra-fetch semua produk agar tidak perlu await di dalam .map() */
  const allProdsH = await window.ArkhivezProducts.getAll();
  const prodMapH  = {};
  allProdsH.forEach(p => { prodMapH[p.id] = p; });
  body.innerHTML = mine.map(order => {
    const s = statusMap[order.status] || { label: order.status.toUpperCase(), color: '#555', bg: '#eee' };
    const tgl = new Date(order.createdAt).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
    const items = (order.items || []).map(i => {
      const prod = prodMapH[i.productId];
      const imgSrc = (prod && prod.image) ? prod.image : 'https://picsum.photos/seed/'+i.productId+'/48/60';
      return `<div style="display:flex;align-items:center;gap:.65rem;padding:.5rem 0;border-bottom:1px solid #f5f5f5;">
        <img src="${imgSrc}" style="width:40px;height:50px;object-fit:cover;border-radius:4px;flex-shrink:0" onerror="this.onerror=null;this.src='https://picsum.photos/seed/${i.productId}/40/50'">
        <div style="flex:1;min-width:0">
          <p style="font-size:.82rem;font-weight:500;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${i.productName||'-'}</p>
          <p style="font-size:.75rem;color:#888;margin:.1rem 0 0">${i.qty}× &times; ${fmt(i.price)}</p>
        </div>
        <p style="font-size:.82rem;font-weight:600;color:var(--color-gold);flex-shrink:0">${fmt(i.price*i.qty)}</p>
      </div>`;
    }).join('');
    const payIcon = order.paymentMethod === 'Transfer Bank' ? '🏦' : order.paymentMethod === 'E-Wallet' ? '📱' : '🤝';

    return `
    <div style="background:var(--color-surface);border-radius:10px;padding:1.25rem;margin-bottom:1rem;box-shadow:0 1px 4px rgba(0,0,0,.07);border:1px solid #eee">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem">
        <strong style="font-family:var(--font-display);font-size:1rem">#${order.id}</strong>
        <span style="font-size:.7rem;font-weight:600;padding:3px 10px;border-radius:20px;background:${s.bg};color:${s.color};letter-spacing:.5px">${s.label}</span>
      </div>
      <p style="font-size:.78rem;color:var(--color-text-muted);margin-bottom:.75rem">📅 ${tgl} &nbsp;•&nbsp; ${payIcon} ${order.paymentMethod}</p>
      <div style="margin-bottom:.75rem;line-height:1.8">${items}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding-top:.75rem;border-top:1px dashed #ddd">
        <span style="font-size:.8rem;color:#888">Total Belanja</span>
        <strong style="color:var(--color-gold);font-size:1rem">${window.ArkhivezProducts.formatRupiah(order.total)}</strong>
      </div>
    </div>`;
  }).join('');
}

/* ============================================================
   13. CHECKOUT MULTI-STEP
   ============================================================ */

/* State global checkout */
let _checkoutOrderData = null;

function initCheckoutUI() {
  const modal    = document.getElementById('checkoutModal');
  const close    = document.getElementById('checkoutClose');
  const backdrop = document.getElementById('checkoutBackdrop');
  const form     = document.getElementById('checkoutForm');
  if (!modal) return;

  if (close)    close.addEventListener('click', () => closeCheckout(true));
  if (backdrop) backdrop.addEventListener('click', () => closeCheckout(true));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal && !modal.hidden) closeCheckout(true);
  });
  if (form) form.addEventListener('submit', e => { e.preventDefault(); goToCheckoutStep2(); });
}

function openCheckoutModal() {
  const cart = loadCart();
  if (!cart.length) { showToast('⚠️ Keranjang masih kosong!'); return; }

  const modal = document.getElementById('checkoutModal');
  if (!modal) return;

  document.getElementById('cartModal').hidden = true;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  goToCheckoutStep(1);

  /* Pre-fill nama dari session */
  const session = window.ArkhivezAuth.getSession();
  const coName = document.getElementById('coName');
  if (coName && session) coName.value = session.name || '';

  /* Update total */
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const el = document.getElementById('checkoutTotalPreview');
  if (el) el.textContent = window.ArkhivezProducts.formatRupiah(total);
}

function goToCheckoutStep(step) {
  [1, 2, 3].forEach(n => {
    const el = document.getElementById('checkoutStep' + n);
    if (el) el.hidden = (n !== step);
  });
  /* Update step indicator */
  document.querySelectorAll('.co-step-dot').forEach(dot => {
    const s = parseInt(dot.dataset.step);
    dot.classList.toggle('active',    s === step);
    dot.classList.toggle('done',      s < step);
    dot.classList.toggle('inactive',  s > step);
  });
  const titleMap = { 1: 'Checkout Pesanan', 2: 'Instruksi Pembayaran', 3: 'Pesanan Berhasil! 🎉' };
  const titleEl = document.getElementById('checkoutModalTitle');
  if (titleEl) titleEl.textContent = titleMap[step] || 'Checkout';
}

function goToCheckoutStep2() {
  /* Validasi Step 1 */
  const name    = (document.getElementById('coName')    || {}).value || '';
  const phone   = (document.getElementById('coPhone')   || {}).value || '';
  const address = (document.getElementById('coAddress') || {}).value || '';
  const payment = (document.getElementById('coPayment') || {}).value || '';

  if (!name.trim())    { showToast('⚠️ Nama penerima wajib diisi'); return; }
  if (!phone.trim())   { showToast('⚠️ Nomor telepon wajib diisi'); return; }
  if (!address.trim()) { showToast('⚠️ Alamat pengiriman wajib diisi'); return; }

  const cart   = loadCart();
  const total  = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const session = window.ArkhivezAuth.getSession();

  /* Simpan data sementara */
  _checkoutOrderData = {
    customerId:      session ? String(session.id) : '',
    customerName:    name.trim(),
    customerPhone:   phone.trim(),
    customerAddress: address.trim(),
    paymentMethod:   payment,
    items: cart.map(i => ({ productId: i.id, productName: i.name, price: i.price, qty: i.qty })),
    total,
    status: 'diproses',
  };

  /* Render instruksi pembayaran */
  renderPaymentInstruction(payment, total, address);
  goToCheckoutStep(2);
}

function renderPaymentInstruction(method, total, address) {
  const body = document.getElementById('paymentInstructionBody');
  if (!body) return;
  const fmt = window.ArkhivezProducts.formatRupiah;

  if (method === 'Transfer Bank') {
    body.innerHTML = `
      <div style="text-align:center;margin-bottom:1.5rem">
        <div style="font-size:2.5rem">🏦</div>
        <h4 style="font-family:var(--font-display);margin:.5rem 0 .25rem">Transfer Bank</h4>
        <p style="font-size:.85rem;color:#888">Selesaikan pembayaran dalam <strong style="color:#c0392b">1×24 jam</strong></p>
      </div>
      <div style="background:#f9f6f0;border-radius:10px;padding:1.25rem;border:1px solid #e8e0d0;margin-bottom:1.25rem">
        <div style="display:grid;gap:.75rem">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:.85rem;color:#888">Bank</span>
            <div style="display:flex;align-items:center;gap:.5rem">
              <span style="background:#003087;color:#fff;font-size:.7rem;font-weight:700;padding:2px 8px;border-radius:4px">BCA</span>
              <span style="font-size:.85rem;font-weight:600">Bank Central Asia</span>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:.85rem;color:#888">No. Rekening</span>
            <span style="font-weight:700;font-size:1.1rem;letter-spacing:.1em;cursor:pointer" onclick="navigator.clipboard&&navigator.clipboard.writeText('1234567890');showToast('✓ Nomor disalin!')">
              1234 5678 90 📋
            </span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:.85rem;color:#888">Atas Nama</span>
            <span style="font-weight:600">PT ARKHIVEZ INDONESIA</span>
          </div>
          <div style="border-top:1px dashed #ccc;padding-top:.75rem;display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:.85rem;color:#888">Total Transfer</span>
            <strong style="color:var(--color-gold);font-size:1.15rem">${fmt(total)}</strong>
          </div>
        </div>
      </div>
      <div style="background:#fff8e1;border-radius:8px;padding:1rem;border-left:3px solid #f6b93b;font-size:.82rem;line-height:1.6;color:#555">
        <strong style="color:#333">📌 Petunjuk Transfer:</strong><br>
        1. Transfer <strong>tepat</strong> sesuai nominal di atas.<br>
        2. Cantumkan <em>nama Anda</em> pada keterangan/berita transfer.<br>
        3. Simpan bukti transfer, pesanan diproses setelah konfirmasi.
      </div>`;

  } else if (method === 'E-Wallet') {
    body.innerHTML = `
      <div style="text-align:center;margin-bottom:1.5rem">
        <div style="font-size:2.5rem">📱</div>
        <h4 style="font-family:var(--font-display);margin:.5rem 0 .25rem">Pembayaran E-Wallet</h4>
        <p style="font-size:.85rem;color:#888">Pilih dompet digital Anda</p>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin-bottom:1.25rem" id="ewalletOptions">
        ${[
          { id:'gopay',  label:'GoPay',  color:'#00AED6', emoji:'🟦' },
          { id:'ovo',    label:'OVO',    color:'#4C3494', emoji:'🟣' },
          { id:'dana',   label:'DANA',   color:'#118EEA', emoji:'💙' },
        ].map(w => `
          <label style="cursor:pointer">
            <input type="radio" name="ewallet" value="${w.id}" style="display:none"
                   onchange="document.getElementById('ewalletNum').textContent='0812-3456-7890 (${w.label})';document.getElementById('ewalletNumWrap').style.display='block'">
            <div class="ewallet-opt" style="border:2px solid #e0e0e0;border-radius:10px;padding:.75rem;text-align:center;transition:all .2s" data-wallet="${w.id}">
              <div style="font-size:1.5rem">${w.emoji}</div>
              <div style="font-size:.75rem;font-weight:600;margin-top:.25rem">${w.label}</div>
            </div>
          </label>`).join('')}
      </div>
      <div id="ewalletNumWrap" style="display:none;background:#f9f6f0;border-radius:10px;padding:1.25rem;border:1px solid #e8e0d0;margin-bottom:1rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem">
          <span style="font-size:.85rem;color:#888">Nomor Tujuan</span>
          <span id="ewalletNum" style="font-weight:700;font-size:1rem;cursor:pointer"
                onclick="navigator.clipboard&&navigator.clipboard.writeText('081234567890');showToast('✓ Nomor disalin!')">— 📋</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:.85rem;color:#888">Total Bayar</span>
          <strong style="color:var(--color-gold);font-size:1.15rem">${fmt(total)}</strong>
        </div>
      </div>
      <div style="background:#e8f5e9;border-radius:8px;padding:1rem;border-left:3px solid #2e7d32;font-size:.82rem;line-height:1.6;color:#555">
        <strong style="color:#1b5e20">✅ Langkah Pembayaran:</strong><br>
        1. Pilih e-wallet → salin nomor tujuan.<br>
        2. Transfer nominal <strong>${fmt(total)}</strong> tepat.<br>
        3. Screenshot bukti → klik Konfirmasi Pembayaran.
      </div>
      <script>
        document.getElementById('ewalletOptions').addEventListener('change',function(e){
          document.querySelectorAll('.ewallet-opt').forEach(el=>el.style.border='2px solid #e0e0e0');
          const sel=document.querySelector('.ewallet-opt[data-wallet="'+e.target.value+'"]');
          if(sel) sel.style.border='2px solid var(--color-gold)';
        });
      <\/script>`;

  } else { /* COD */
    const ongkir = 15000;
    const totalCOD = total + ongkir;
    body.innerHTML = `
      <div style="text-align:center;margin-bottom:1.5rem">
        <div style="font-size:2.5rem">🤝</div>
        <h4 style="font-family:var(--font-display);margin:.5rem 0 .25rem">Bayar di Tempat (COD)</h4>
        <p style="font-size:.85rem;color:#888">Bayar saat barang tiba di tangan Anda</p>
      </div>
      <div style="background:#f9f6f0;border-radius:10px;padding:1.25rem;border:1px solid #e8e0d0;margin-bottom:1.25rem">
        <div style="display:grid;gap:.75rem">
          <div style="display:flex;justify-content:space-between">
            <span style="font-size:.85rem;color:#888">Kurir</span>
            <span style="font-weight:600">🚚 JNE Reguler</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="font-size:.85rem;color:#888">Estimasi Tiba</span>
            <span style="font-weight:600">2–3 hari kerja</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="font-size:.85rem;color:#888">Alamat Tujuan</span>
            <span style="font-weight:600;max-width:60%;text-align:right;font-size:.85rem">${address}</span>
          </div>
          <div style="border-top:1px dashed #ccc;padding-top:.75rem">
            <div style="display:flex;justify-content:space-between;margin-bottom:.4rem">
              <span style="font-size:.85rem;color:#888">Subtotal Produk</span>
              <span>${fmt(total)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:.4rem">
              <span style="font-size:.85rem;color:#888">Ongkos COD</span>
              <span>${fmt(ongkir)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-weight:700">
              <span>Total Dibayar Kurir</span>
              <strong style="color:var(--color-gold);font-size:1.15rem">${fmt(totalCOD)}</strong>
            </div>
          </div>
        </div>
      </div>
      <div style="background:#e3f2fd;border-radius:8px;padding:1rem;border-left:3px solid #0277bd;font-size:.82rem;line-height:1.6;color:#555">
        <strong style="color:#01579b">📦 Penting:</strong><br>
        • Siapkan uang tunai <strong>${fmt(totalCOD)}</strong> (pas lebih baik).<br>
        • Periksa kondisi paket sebelum membayar ke kurir.<br>
        • Pesanan tidak dapat dibatalkan setelah dikonfirmasi.
      </div>`;
  }
}

async function confirmPayment() {
  if (!_checkoutOrderData) return;
  const saved = await window.ArkhivezOrders.add(_checkoutOrderData);
  if (!saved) { showToast('❌ Gagal memproses. Coba lagi.'); return; }

  /* Kurangi stok produk */
  for (const item of (_checkoutOrderData.items || [])) {
    const prod = await window.ArkhivezProducts.getById(item.productId);
    if (prod) await window.ArkhivezProducts.patch(item.productId, { stock: Math.max(0, prod.stock - item.qty) });
  }

  /* Kosongkan keranjang */
  localStorage.removeItem(CART_KEY);
  updateCartBadge();

  /* Render halaman sukses */
  renderOrderSuccess(saved);
  goToCheckoutStep(3);
  _checkoutOrderData = null;
}

function renderOrderSuccess(order) {
  const body = document.getElementById('orderSuccessBody');
  if (!body) return;
  const fmt = window.ArkhivezProducts.formatRupiah;
  const payIcon = order.paymentMethod === 'Transfer Bank' ? '🏦' : order.paymentMethod === 'E-Wallet' ? '📱' : '🤝';
  body.innerHTML = `
    <div style="text-align:center;padding:1rem 0 1.5rem">
      <div style="font-size:4rem;margin-bottom:.5rem">🎉</div>
      <h3 style="font-family:var(--font-display);font-size:1.5rem;margin-bottom:.25rem">Pesanan Dikonfirmasi!</h3>
      <p style="color:#888;font-size:.9rem">Terima kasih telah berbelanja di ARKHIVEZ</p>
    </div>
    <div style="background:#f9f6f0;border-radius:10px;padding:1.25rem;border:1px solid #e8e0d0">
      <div style="display:grid;gap:.7rem">
        <div style="display:flex;justify-content:space-between">
          <span style="font-size:.85rem;color:#888">Nomor Pesanan</span>
          <strong style="color:var(--color-gold)">#${order.id}</strong>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="font-size:.85rem;color:#888">Metode Bayar</span>
          <span style="font-weight:600">${payIcon} ${order.paymentMethod}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="font-size:.85rem;color:#888">Status</span>
          <span style="background:#fffde7;color:#b8860b;padding:2px 10px;border-radius:20px;font-size:.75rem;font-weight:600">DIPROSES</span>
        </div>
        <div style="border-top:1px dashed #ccc;padding-top:.7rem;display:flex;justify-content:space-between">
          <span style="font-size:.85rem;color:#888">Total</span>
          <strong style="color:var(--color-gold);font-size:1.1rem">${fmt(order.total)}</strong>
        </div>
      </div>
    </div>
    <p style="text-align:center;font-size:.8rem;color:#aaa;margin-top:1.25rem">
      Cek status pesanan di menu <strong>Riwayat Pesanan</strong>
    </p>`;
}

function closeCheckout(confirm) {
  if (confirm && _checkoutOrderData) {
    if (!window.confirm('Batalkan checkout? Data isian akan hilang.')) return;
    _checkoutOrderData = null;
  }
  const modal = document.getElementById('checkoutModal');
  if (modal) modal.hidden = true;
  document.body.style.overflow = '';
}

function closeCheckoutFinal() {
  const modal = document.getElementById('checkoutModal');
  if (modal) modal.hidden = true;
  document.body.style.overflow = '';
  renderCartItems(); updateCartBadge();
}

/* ============================================================
   14. QUICK VIEW
   ============================================================ */
async function openQuickView(productId) {
  const product = await window.ArkhivezProducts.getById(productId);
  if (!product) return;
  const modal  = document.getElementById('quickViewModal');
  const body   = document.getElementById('quickViewBody');
  if (!modal || !body) return;
  const fmt    = window.ArkhivezProducts.formatRupiah;
  const discount = product.priceOri > product.price
    ? Math.round(((product.priceOri - product.price) / product.priceOri) * 100) : 0;

  body.innerHTML = `
    <div style="display:flex;gap:1.5rem;flex-wrap:wrap">
      <div style="flex:1;min-width:220px">
        <img src="${product.image || 'https://picsum.photos/seed/'+product.id+'/400/530'}"
             alt="${product.name}" loading="lazy"
             style="width:100%;border-radius:8px;aspect-ratio:3/4;object-fit:cover"
             onerror="this.onerror=null;this.src='https://picsum.photos/seed/${product.id}/400/530'">
      </div>
      <div style="flex:1;min-width:220px;display:flex;flex-direction:column;gap:.75rem">
        <div>
          <span style="color:var(--color-gold);font-size:.75rem;font-weight:600;letter-spacing:1px">${product.brand}</span>
          <h2 style="font-family:var(--font-display);margin:.4rem 0;font-size:1.35rem">${product.name}</h2>
          ${product.fitType ? `<span style="background:#f0ede7;font-size:.7rem;padding:2px 8px;border-radius:4px;text-transform:uppercase">${product.fitType}</span>` : ''}
        </div>
        <div style="display:flex;align-items:baseline;gap:.75rem">
          <span style="font-size:1.4rem;font-weight:600;color:var(--color-gold)">${fmt(product.price)}</span>
          ${product.priceOri > product.price ? `
            <span style="text-decoration:line-through;color:#aaa;font-size:.9rem">${fmt(product.priceOri)}</span>
            <span style="background:#c0392b;color:#fff;font-size:.7rem;padding:2px 7px;border-radius:4px">-${discount}%</span>` : ''}
        </div>
        <p style="font-size:.88rem;color:#666;line-height:1.65">${product.description || 'Tidak ada deskripsi.'}</p>
        ${product.sizes && product.sizes.length && product.category === 'pakaian'
          ? `<div><p style="font-size:.8rem;font-weight:600;margin-bottom:.4rem">UKURAN</p>
             <div style="display:flex;flex-wrap:wrap;gap:.4rem">${product.sizes.map(s => `<span style="border:1px solid #ddd;padding:4px 12px;border-radius:4px;font-size:.8rem">${s}</span>`).join('')}</div></div>` : ''}
        <p style="font-size:.8rem;color:${product.stock <= 5 ? '#c0392b' : '#888'}">
          ${product.stock === 0 ? '❌ Stok habis' : product.stock <= 5 ? `⚠️ Sisa ${product.stock} item` : `✅ Stok: ${product.stock} item`}
        </p>
        <button style="width:100%;padding:12px;background:var(--color-dark);color:#fff;border:none;cursor:pointer;font-size:.85rem;letter-spacing:.1em;text-transform:uppercase;border-radius:4px;transition:background .2s"
                onclick="window.addToCart('${product.id}');document.getElementById('quickViewModal').hidden=true;document.body.style.overflow=''"
                ${product.stock === 0 ? 'disabled' : ''}
                onmouseover="this.style.background='var(--color-gold)'" onmouseout="this.style.background='var(--color-dark)'">
          ${product.stock === 0 ? 'Habis Terjual' : '+ Tambah ke Keranjang'}
        </button>
      </div>
    </div>`;

  modal.hidden = false; document.body.style.overflow = 'hidden';
  const close   = document.getElementById('quickViewClose');
  const backdrop = document.getElementById('quickViewBackdrop');
  function closeQV() { modal.hidden = true; document.body.style.overflow = ''; }
  if (close)    close.onclick    = closeQV;
  if (backdrop) backdrop.onclick = closeQV;
}

/* ── Global Exports ── */
window.openCheckoutModal   = openCheckoutModal;
window.openHistoryModal    = openHistoryModal;
window.openWishlistModal   = openWishlistModal;
window.openQuickView       = openQuickView;
window.addToCart           = addToCart;
window.changeQty           = changeQty;
window.removeFromCart      = removeFromCart;
window.showToast           = showToast;
window.goToCheckoutStep    = goToCheckoutStep;
window.confirmPayment      = confirmPayment;
window.closeCheckoutFinal  = closeCheckoutFinal;

/* ============================================================
   15. PENGATURAN PROFIL PELANGGAN
   ============================================================ */
const PROFILE_KEY = 'arkhivez_profiles';

function loadUserProfile(username) {
  try {
    const all = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
    return all[username] || {};
  } catch(e) { return {}; }
}
function saveUserProfile(username, data) {
  try {
    const all = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
    all[username] = Object.assign(all[username] || {}, data);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(all));
  } catch(e) {}
}

function openProfileModal() {
  const session = window.ArkhivezAuth.getSession();
  if (!session) return;
  const modal = document.getElementById('profileModal');
  if (!modal) return;

  const saved = loadUserProfile(session.username);

  /* Isi form */
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('profName',    saved.name    || session.name);
  set('profEmail',   saved.email   || session.email);
  set('profPhone',   saved.phone   || '');
  set('profAddress', saved.address || '');

  /* Avatar: foto atau inisial */
  const circle = document.getElementById('profAvatarCircle');
  if (circle) {
    if (saved.avatarImg) {
      circle.innerHTML = '<img src="'+saved.avatarImg+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="avatar">';
    } else {
      updateAvatarDisplay(saved.name || session.name, saved.avatarColor);
    }
  }

  /* Update header avatar juga */
  _updateHeaderAvatar(saved);

  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function _updateHeaderAvatar(saved) {
  const btn = document.getElementById('headerAvatar');
  if (!btn) return;
  if (saved && saved.avatarImg) {
    btn.innerHTML = '<img src="'+saved.avatarImg+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="avatar">';
    btn.style.padding = '0';
  } else {
    const session = window.ArkhivezAuth.getSession();
    const name    = (saved && saved.name) || (session && session.name) || 'U';
    const color   = (saved && saved.avatarColor) || '#B8960C';
    const initials= name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
    btn.innerHTML = initials;
    btn.style.background = color;
  }
}

function updateAvatarDisplay(name, color) {
  const el = document.getElementById('profAvatarCircle');
  if (!el) return;
  const initials = (name || '?').split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
  el.textContent = initials;
  el.style.background = color || '#B8960C';
}

async function saveProfile() {
  const session = window.ArkhivezAuth.getSession();
  if (!session) return;

  const name    = (document.getElementById('profName')    || {}).value || '';
  const phone   = (document.getElementById('profPhone')   || {}).value || '';
  const address = (document.getElementById('profAddress') || {}).value || '';
  const pwOld   = (document.getElementById('profPwOld')   || {}).value || '';
  const pwNew   = (document.getElementById('profPwNew')   || {}).value || '';

  if (!name.trim()) { showToast('⚠️ Nama tidak boleh kosong'); return; }

  const update = { name: name.trim(), phone: phone.trim(), address: address.trim() };

  /* Ganti password */
  if (pwNew) {
    if (!pwOld) { showToast('⚠️ Masukkan password lama terlebih dahulu'); return; }
    /* Verifikasi di ACCOUNTS (dari auth.js) */
    const accounts = (typeof ACCOUNTS !== 'undefined') ? ACCOUNTS : [];
    const acc = accounts.find(a => a.username === session.username);
    if (acc && acc.password !== pwOld) { showToast('❌ Password lama salah'); return; }
    if (pwNew.length < 6) { showToast('⚠️ Password baru minimal 6 karakter'); return; }
    if (acc) acc.password = pwNew;
    update.passwordChanged = true;
  }

  saveUserProfile(session.username, update);

  /* Update session */
  const rawSession = JSON.parse(
    sessionStorage.getItem('arkhivez_session') || 
    localStorage.getItem('arkhivez_session') || '{}'
  );
  rawSession.name = name.trim();
  sessionStorage.setItem('arkhivez_session', JSON.stringify(rawSession));
  localStorage.setItem('arkhivez_session', JSON.stringify(rawSession));

  /* Sync ke tabel pelanggan jika ada customerId */
  const cusId = session.customerId || ('CUS-00' + session.id);
  try {
    const cus = await window.ArkhivezCustomers.getById(cusId);
    if (cus) await window.ArkhivezCustomers.update(cusId, { name: name.trim(), phone: phone.trim(), address: address.trim() });
  } catch(e) {}

  /* Update header nama & avatar */
  const userNameEl = document.getElementById('userName');
  if (userNameEl) userNameEl.textContent = name.trim();
  const savedFull  = loadUserProfile(session.username);
  _updateHeaderAvatar(savedFull);

  _logCatalogActivity('Edit Profil','Pelanggan memperbarui profil');
  showToast('✓ Profil berhasil disimpan!');
  document.getElementById('profileModal').hidden = true;
  document.body.style.overflow = '';
}

/* Pilih warna avatar */
window.setAvatarColor = function(color) {
  const session = window.ArkhivezAuth.getSession();
  if (!session) return;
  saveUserProfile(session.username, { avatarColor: color, avatarImg: null });
  updateAvatarDisplay((document.getElementById('profName') || {}).value, color);
  const circle = document.getElementById('profAvatarCircle');
  if (circle) circle.innerHTML = (document.getElementById('profName')||{value:''}).value.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() || 'U';
  document.querySelectorAll('.avatar-color-opt').forEach(el => {
    el.classList.toggle('selected', el.dataset.color === color);
    if (el.dataset.color === color) el.style.boxShadow = '0 0 0 2px '+color;
    else el.style.boxShadow = '';
  });
  _updateHeaderAvatar(loadUserProfile(session.username));
};

/* Upload foto avatar */
window.handleAvatarUpload = function(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showToast('⚠️ Ukuran foto maks 2 MB'); return; }
  const reader = new FileReader();
  reader.onload = function(e) {
    const b64    = e.target.result;
    const circle = document.getElementById('profAvatarCircle');
    if (circle) circle.innerHTML = '<img src="'+b64+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="avatar">';
    const session = window.ArkhivezAuth.getSession();
    if (session) saveUserProfile(session.username, { avatarImg: b64 });
    _updateHeaderAvatar({ avatarImg: b64 });
    showToast('✓ Foto profil diperbarui!');
  };
  reader.readAsDataURL(file);
};

window.openProfileModal  = openProfileModal;
window.saveProfile       = saveProfile;

/* ── Log aktivitas pelanggan ke localStorage ── */
function _logCatalogActivity(aksi, detail) {
  try {
    var KEY  = 'arkhivez_activity_log';
    var ses  = window.ArkhivezAuth.getSession();
    var log  = JSON.parse(localStorage.getItem(KEY)||'[]');
    log.unshift({id:Date.now(), aksi:aksi, detail:detail, user:(ses?ses.name:'Pelanggan'), time:new Date().toLocaleString('id-ID')});
    if (log.length>100) log=log.slice(0,100);
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch(e){}
}