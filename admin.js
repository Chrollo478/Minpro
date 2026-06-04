/* ============================================================
   MANKUTU STORE — admin.js  (Versi Full-Feature & Anti-Bug)
   Semua fitur admin berjalan penuh:
   - Dashboard dengan KPI real dari data localStorage
   - CRUD Produk (Tambah / Edit / Hapus + validasi)
   - CRUD Pesanan (Tambah / Edit Status / Detail / Hapus)
   - CRUD Pelanggan (Tambah / Edit / Hapus)
   - Search & Filter semua tabel
   - Modal konfirmasi kustom & Histori Belanja Pelanggan
   - Toast notification & Proteksi Sesi Berlapis
   ============================================================ */

/* ============================================================
   1. INISIALISASI
   ============================================================ */
(function init() {
  var session = window.ArkhivezAuth.requireAuth('admin');
  if (!session) return;

  var nameEl = document.getElementById('adminName');
  if (nameEl) nameEl.textContent = session.name;

  // 2. Pasang Handler Logout di Awal Agar Kebal dari Error Komponen Lain
  var btnLogout = document.getElementById('adminLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', handleAdminLogout);
  }

  // 3. Jalankan Seluruh Komponen UI dengan Blok Isolasi Mandiri (Try-Catch)
  // Jika salah satu tabel/modal mengalami kegagalan data, fitur lainnya tidak akan ikut mati.
  try { initSidebarNav(); } catch (e) { console.error("Gagal memuat Navigasi Sidebar:", e); }
  try { initAdminHamburger(); } catch (e) { console.error("Gagal memuat Hamburger Menu:", e); }
  try { initProductModal(); } catch (e) { console.error("Gagal memuat Modal Produk:", e); }
  try { initOrderModal(); } catch (e) { console.error("Gagal memuat Modal Pesanan:", e); }
  try { initCustomerModal(); } catch (e) { console.error("Gagal memuat Modal Pelanggan:", e); }
  try { initProductTableListeners(); } catch (e) { console.error("Gagal memuat Listener Tabel Produk:", e); }
  try { initOrderTableListeners(); } catch (e) { console.error("Gagal memuat Listener Tabel Pesanan:", e); }
  try { initCustomerTableListeners(); } catch (e) { console.error("Gagal memuat Listener Tabel Pelanggan:", e); }
  try { updateDashboard(); } catch (e) { console.error("Gagal memuat Dashboard KPI:", e); }

  /* Event delegation — tabel produk */
  var prodTbody = document.getElementById('productTableBody');
  if (prodTbody) {
    prodTbody.addEventListener('click', function(e) {
      var edit = e.target.closest('[data-action="edit-prod"]');
      var del  = e.target.closest('[data-action="del-prod"]');
      if (edit) openEditProductModal(edit.dataset.id);
      if (del) {
        confirmDelete('produk', del.dataset.id, del.dataset.name, async function() {
          if (await window.ArkhivezProducts.delete(del.dataset.id)) {
            showToast('🗑️ Produk berhasil dihapus.');
            renderProductTable();
            updateDashboard();
          }
        });
      }
    });
  }

  /* Event delegation — tabel pesanan */
  var ordTbody = document.getElementById('orderTableBody');
  if (ordTbody) {
    ordTbody.addEventListener('click', function(e) {
      var detail = e.target.closest('[data-action="detail-order"]');
      var edit   = e.target.closest('[data-action="edit-order"]');
      var del    = e.target.closest('[data-action="del-order"]');
      if (detail) openOrderDetail(detail.dataset.id);
      if (edit)   openEditOrderModal(edit.dataset.id);
      if (del) {
        confirmDelete('pesanan', del.dataset.id, '#'+del.dataset.id, async function() {
          if (await window.ArkhivezOrders.delete(del.dataset.id)) {
            showToast('🗑️ Pesanan berhasil dihapus.');
            renderOrderTable();
            updateDashboard();
          }
        });
      }
    });
  }

  /* Event delegation — tabel pelanggan */
  var cusTbody = document.getElementById('customerTableBody');
  if (cusTbody) {
    cusTbody.addEventListener('click', function(e) {
      var edit = e.target.closest('[data-action="edit-cus"]');
      var del  = e.target.closest('[data-action="del-cus"]');
      var ord  = e.target.closest('[data-action="cus-orders"]');
      if (edit) openEditCustomerModal(edit.dataset.id);
      if (del) {
        confirmDelete('pelanggan', del.dataset.id, del.dataset.name, async function() {
          if (await window.ArkhivezCustomers.delete(del.dataset.id)) {
            showToast('🗑️ Data pelanggan dihapus.'); 
            renderCustomerTable(); 
            updateDashboard();
          }
        });
      }
      if (ord) showCustomerOrders(ord.dataset.id, ord.dataset.name);
    });
  }
})();

function handleAdminLogout(e) {
  if (e) e.preventDefault();
  if (confirm('Yakin ingin keluar dari dashboard admin?')) {
    window.ArkhivezAuth.logout();
    window.location.href = 'login.html';
  }
}

/* ============================================================
   2. NAVIGASI SIDEBAR
   ============================================================ */
var SECTIONS = {
  dashboard:'sectionDashboard', produk:'sectionProduk',
  pesanan:'sectionPesanan', pelanggan:'sectionPelanggan',
  laporan:'sectionLaporan', pengaturan:'sectionPengaturan',
  aktivitas:'sectionAktivitas',
};
var TITLES = {
  dashboard:'Dashboard', produk:'Manajemen Produk',
  pesanan:'Manajemen Pesanan', pelanggan:'Data Pelanggan',
  laporan:'Laporan Penjualan', pengaturan:'Pengaturan Toko',
  aktivitas:'Log Aktivitas',
};

function initSidebarNav() {
  document.querySelectorAll('.sidebar-nav-link[data-section]').forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      showSection(this.dataset.section);
      closeSidebarMobile();
    });
  });
}

async function showSection(name) {
  Object.values(SECTIONS).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('admin-content--hidden');
  });
  var target = document.getElementById(SECTIONS[name]);
  if (target) target.classList.remove('admin-content--hidden');

  document.querySelectorAll('.sidebar-nav-link').forEach(function(link) {
    link.classList.toggle('sidebar-nav-link--active', link.dataset.section === name);
  });

  var t = TITLES[name] || name;
  var pe = document.getElementById('adminPageTitle');
  var be = document.getElementById('adminBreadcrumb');
  if (pe) pe.textContent = t;
  if (be) be.textContent = t;

  if (name === 'produk')    renderProductTable();
  if (name === 'pesanan')   renderOrderTable();
  if (name === 'pelanggan') renderCustomerTable();
  if (name === 'laporan')   renderReport();
  if (name === 'aktivitas') renderActivityLog();
  checkLowStock();
}
window.showSection = showSection;

/* ============================================================
   3. SIDEBAR MOBILE
   ============================================================ */
function initAdminHamburger() {
  var hb   = document.getElementById('adminHamburger');
  var sb   = document.getElementById('adminSidebar');
  if (!hb || !sb) return;
  
  var bd   = document.getElementById('sbBackdrop');
  if (!bd) {
    bd = document.createElement('div');
    bd.id = 'sbBackdrop';
    bd.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:149;';
    document.body.appendChild(bd);
  }
  
  hb.addEventListener('click', function() {
    var open = sb.classList.toggle('open');
    bd.style.display       = open ? 'block' : 'none';
    document.body.style.overflow = open ? 'hidden' : '';
  });
  bd.addEventListener('click', closeSidebarMobile);
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeSidebarMobile(); });
}

function closeSidebarMobile() {
  var sb = document.getElementById('adminSidebar');
  var bd = document.getElementById('sbBackdrop');
  if (sb) sb.classList.remove('open');
  if (bd) bd.style.display = 'none';
  document.body.style.overflow = '';
}

/* ============================================================
   4. DASHBOARD — KPI REAL
   ============================================================ */
async function updateDashboard() {
  checkLowStock();
  var stats = await window.ArkhivezStore.getKPI();
  var fmt   = window.ArkhivezProducts.formatRupiah;

  setText('kpiRevenue',      fmt(stats.totalRevenue));
  setText('kpiTotalOrders',  stats.totalOrders);
  setText('kpiTotalProduct', stats.totalActiveProducts);
  setText('kpiTotalCustomer',stats.totalCustomers);
  setText('kpiAvgOrder',     fmt(stats.avgOrderValue));
  setText('kpiSelesai',      stats.selesaiOrders);
  setText('kpiDiproses',     stats.diprosesOrders);
  setText('kpiDikirim',      stats.dikirimOrders);

  await renderRecentOrders();
}

async function renderRecentOrders() {
  var tbody = document.getElementById('dashRecentOrders');
  if (!tbody) return;
  var allOrd = await window.ArkhivezOrders.getAll();
  var orders = allOrd.slice(0, 5);
  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--color-text-muted);">Belum ada pesanan.</td></tr>';
    return;
  }
  tbody.innerHTML = orders.map(function(o) {
    var sc = statusConfig(o.status);
    var itemStr = (o.items || []).map(function(i){ return i.productName + ' x'+i.qty; }).join(', ');
    return '<tr>' +
      '<td><code>#'+o.id+'</code></td>' +
      '<td>'+esc(o.customerName)+'</td>' +
      '<td style="max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+esc(itemStr)+'</td>' +
      '<td>'+window.ArkhivezProducts.formatRupiah(o.total)+'</td>' +
      '<td><span class="badge '+sc.cls+'">'+sc.label+'</span></td>' +
    '</tr>';
  }).join('');
}

/* ============================================================
   5. TABEL PRODUK
   ============================================================ */
var prodState = { search:'', kategori:'', status:'' };

function initProductTableListeners() {
  debounceInput('productSearch', function(v) { prodState.search = v; renderProductTable(); });
  onChangeSelect('filterKategori', function(v) { prodState.kategori = v; renderProductTable(); });
  onChangeSelect('filterStatus',   function(v) { prodState.status   = v; renderProductTable(); });
}

async function renderProductTable() {
  var tbody = document.getElementById('productTableBody');
  if (!tbody) return;
  var fmt   = window.ArkhivezProducts.formatRupiah;
  var list  = await window.ArkhivezProducts.getAll();
  var total = list.length;

  if (prodState.search)   list = list.filter(function(p){ return searchMatch(p.name+' '+(p.brand||'')+' '+p.id, prodState.search); });
  if (prodState.kategori) list = list.filter(function(p){ return p.category === prodState.kategori; });
  if (prodState.status)   list = list.filter(function(p){ return p.status   === prodState.status;   });

  setText('paginationInfo','Menampilkan '+list.length+' dari '+total+' produk');

  if (!list.length) {
    tbody.innerHTML = emptyRow(8,'Tidak ada produk ditemukan.');
    return;
  }

  var subMap = { 'kemeja':'Kemeja','celana':'Celana','jaket':'Jaket','kaos':'Kaos',
    'setelan':'Setelan','jam-tangan':'Jam Tangan','sepatu':'Sepatu','tas':'Tas',
    'ikat-pinggang':'Ikat Pinggang','dompet':'Dompet','topi':'Topi','kacamata':'Kacamata' };

  tbody.innerHTML = list.map(function(p,i) {
    var stCls = p.status==='aktif' ? 'badge--aktif':'badge--nonaktif';
    var stLbl = p.status==='aktif' ? 'Aktif':'Non-aktif';
    var stk   = p.stock===0 ? '<span style="color:var(--color-danger);font-weight:600;">'+p.stock+'</span>'
              : p.stock<=5  ? '<span style="color:var(--color-warning);font-weight:600;">'+p.stock+'</span>'
              : p.stock;
    /* Harga + diskon — support priceOri maupun price_ori dari Supabase */
    var pOri = p.priceOri || p.price_ori || 0;
    var disc = (pOri && pOri > p.price) ? Math.round(((pOri - p.price) / pOri) * 100) : 0;
    var harga = '<strong>' + fmt(p.price) + '</strong>' +
      (pOri && pOri > p.price
        ? '<br><small style="color:var(--color-text-faint);text-decoration:line-through;">' + fmt(pOri) + '</small>' +
          '<small style="color:#2e7d32;font-size:.7rem;margin-left:3px;">-' + disc + '%</small>'
        : '');
    return '<tr>'+
      '<td style="color:var(--color-text-faint);font-size:.75rem;">'+(i+1)+'</td>'+
      '<td><div class="product-cell">'+
        '<img class="product-cell__img" src="'+esc(p.image||'')+'" alt="'+esc(p.name)+'" loading="lazy" onerror="this.src=\'https://picsum.photos/seed/'+p.id+'/44/56\'">'+
        '<div><p class="product-cell__name">'+esc(p.name)+'</p>'+
        '<p class="product-cell__id">'+p.id+' &middot; '+esc(p.brand||'')+'</p></div></div></td>'+
      '<td style="text-transform:capitalize;">'+esc(p.category)+'</td>'+
      '<td>'+(subMap[p.subCategory]||p.subCategory||'-')+'</td>'+
      '<td>'+harga+'</td>'+
      '<td>'+stk+'</td>'+
      '<td><span class="badge '+stCls+'">'+stLbl+'</span></td>'+
      '<td><div class="action-cell">'+
        '<button class="btn-icon" data-action="edit-prod" data-id="'+p.id+'" title="Edit">✏️</button>'+
        '<button class="btn-icon" data-action="del-prod" data-id="'+p.id+'" data-name="'+esc(p.name)+'" title="Hapus" style="background:rgba(176,48,48,.08);">🗑️</button>'+
      '</div></td>'+
    '</tr>';
  }).join('');
}

/* ── Modal Produk ── */
var SUB_CATS = {
  pakaian:   [{v:'kemeja',l:'Kemeja'},{v:'celana',l:'Celana'},{v:'jaket',l:'Jaket'},{v:'kaos',l:'Kaos'},{v:'setelan',l:'Setelan'},{v:'pakaian-dalam',l:'Pakaian Dalam'}],
  aksesoris:[{v:'jam-tangan',l:'Jam Tangan'},{v:'sepatu',l:'Sepatu'},{v:'tas',l:'Tas'},{v:'ikat-pinggang',l:'Ikat Pinggang'},{v:'dompet',l:'Dompet'},{v:'topi',l:'Topi'},{v:'kacamata',l:'Kacamata'}],
};

function initProductModal() {
  var btnAdd = document.getElementById('btnTambahProduk');
  var form   = document.getElementById('productForm');
  var kat    = document.getElementById('prodKategori');
  if (btnAdd) btnAdd.addEventListener('click', openAddProductModal);
  if (form)   form.addEventListener('submit', function(e){ e.preventDefault(); saveProduct(); });
  if (kat)    kat.addEventListener('change', function(){ fillSubKat(this.value,''); });
  setupModalClose('productModal', function(){ closeProductModal(); });
}

/* openAddProductModal defined below */

async function openEditProductModal(id) {
  var p = await window.ArkhivezProducts.getById(id);
  if (!p) return showToast('❌ Produk tidak ditemukan.','error');
  clearErrors();
  setText2('productModalTitle','Edit Produk');
  setText2('btnSaveProduct','Perbarui Produk');
  setVal('productId',   p.id);
  setVal('prodNama',    p.name);
  setVal('prodBrand',   p.brand||'');
  setVal('prodKategori',p.category);
  /* fillSubKat dipanggil setelah kategori ter-set agar subkat muncul */
  fillSubKat(p.category, p.subCategory || '');
  setVal('prodHarga',     p.price);
  setVal('prodHargaCoret',p.priceOri||'');
  setVal('prodStok',      p.stock);
  setVal('prodBadge',     p.badge||'');
  setVal('prodStatus',    p.status||'aktif');
  setVal('prodFitType',   p.fitType||'');
  setVal('prodMaterial',  p.material||'');
  setVal('prodDeskripsi', p.description||'');
  setVal('prodGambar',      p.image||'');
  setVal('prodGambarHover', p.imageHover||'');
  // Isi checkboxes ukuran
  var savedSizes = Array.isArray(p.sizes) ? p.sizes : [];
  document.querySelectorAll('.prod-size-cb').forEach(function(cb){
    cb.checked = savedSizes.indexOf(cb.value) !== -1;
  });
  resetImgPreview('main');
  resetImgPreview('hover');
  if (window.previewProdImg) {
    window.previewProdImg('main',  p.image||'');
    window.previewProdImg('hover', p.imageHover||'');
  }
  openModal('productModal');
  focusEl('prodNama');
}
window.openEditProductModal = openEditProductModal;

async function openAddProductModal() {
  document.getElementById('productId').value = '';
  ['prodNama','prodBrand','prodDeskripsi','prodGambar','prodGambarHover',
   'prodHarga','prodHargaCoret','prodStok','prodFitType','prodMaterial'].forEach(function(fid){
    var el = document.getElementById(fid); if (el) el.value = '';
  });
  ['prodGambarFile','prodGambarHoverFile'].forEach(function(fid){
    var el = document.getElementById(fid); if (el) el.value = '';
  });
  // Reset checkboxes ukuran
  document.querySelectorAll('.prod-size-cb').forEach(function(cb){ cb.checked = false; });
  // Reset fit dan badge
  setVal('prodBadge',''); setVal('prodStatus','aktif'); setVal('prodKategori','');
  fillSubKat('','');
  resetImgPreview('main'); resetImgPreview('hover');
  setText2('productModalTitle','Tambah Produk Baru');
  setText2('btnSaveProduct','Simpan Produk');
  openModal('productModal');
  focusEl('prodNama');
}
window.openAddProductModal = openAddProductModal;

function closeProductModal() {
  closeModal('productModal'); clearErrors();
  /* Reset gambar preview */
  ['prodGambarFile','prodGambarHoverFile'].forEach(function(id){
    var el = document.getElementById(id); if (el) el.value = '';
  });
  if (window.previewProdImg) {
    window.previewProdImg('main','');
    window.previewProdImg('hover','');
  }
}

function fillSubKat(kat, selected) {
  var sel = document.getElementById('prodSubKategori');
  if (!sel) return;
  sel.innerHTML = '<option value="">Pilih Sub-Kategori</option>';
  (SUB_CATS[kat]||[]).forEach(function(o) {
    var opt = document.createElement('option');
    opt.value = o.v; opt.textContent = o.l;
    if (o.v === selected) opt.selected = true;
    sel.appendChild(opt);
  });
}

async function saveProduct() {
  var id = getVal('productId');
  var data = {
    name: getVal('prodNama').trim(), brand: getVal('prodBrand').trim()||'ARKHIVEZ',
    category: getVal('prodKategori'), subCategory: getVal('prodSubKategori'),
    price: parseInt(getVal('prodHarga'),10)||0,
    priceOri: parseInt(getVal('prodHargaCoret'),10)||0,
    stock: parseInt(getVal('prodStok'),10)||0,
    badge: getVal('prodBadge'), description: getVal('prodDeskripsi').trim(),
    image: getVal('prodGambar').trim(),
    imageHover: getVal('prodGambarHover') ? getVal('prodGambarHover').trim() : '',
    status: getVal('prodStatus'),
  };
  clearErrors();
  var ok = true;
  if (!data.name)             { fieldError('prodNama','Nama produk wajib diisi'); ok=false; }
  if (!data.category)         { fieldError('prodKategori','Pilih kategori'); ok=false; }
  if (!data.price||data.price<=0) { fieldError('prodHarga','Harga harus lebih dari 0'); ok=false; }
  if (data.stock<0)           { fieldError('prodStok','Stok tidak boleh negatif'); ok=false; }
  if (!ok) return;

  // Baca ukuran yang dicentang
  data.sizes   = Array.from(document.querySelectorAll('.prod-size-cb:checked')).map(function(cb){ return cb.value; });
  data.fitType = getVal('prodFitType');
  data.material= getVal('prodMaterial').trim();

  var saved, msg;
  if (id) {
    saved = await window.ArkhivezProducts.update(id, data);
    msg   = saved ? '✓ Produk berhasil diperbarui!' : '❌ Gagal memperbarui produk.';
  } else {
    saved = await window.ArkhivezProducts.add(data);
    msg   = '✓ Produk "' + saved.id + '" ditambahkan!';
  }
  closeProductModal();
  renderProductTable();
  updateDashboard();
  showToast(msg, saved ? 'success' : 'error');
}

/* ============================================================
   6. TABEL PESANAN
   ============================================================ */
var ordState = { search:'', status:'' };

function initOrderTableListeners() {
  var btnAdd = document.getElementById('btnTambahPesanan');
  if (btnAdd) btnAdd.addEventListener('click', openAddOrderModal);
  debounceInput('orderSearch',     function(v){ ordState.search=v; renderOrderTable(); });
  onChangeSelect('filterOrdStatus',function(v){ ordState.status=v; renderOrderTable(); });
}

async function renderOrderTable() {
  var tbody = document.getElementById('orderTableBody');
  if (!tbody) return;
  var list = await window.ArkhivezOrders.getAll();

  if (ordState.search)  list = list.filter(function(o){
    return searchMatch(o.id+' '+o.customerName+' '+(o.items||[]).map(function(i){return i.productName;}).join(' '), ordState.search);
  });
  if (ordState.status) list = list.filter(function(o){ return o.status === ordState.status; });

  setText('orderInfo','Total '+list.length+' pesanan');

  if (!list.length) { tbody.innerHTML = emptyRow(8,'Tidak ada pesanan ditemukan.'); return; }

  tbody.innerHTML = list.map(function(o) {
    var sc     = statusConfig(o.status);
    var items  = (o.items||[]).map(function(i){ return esc(i.productName)+' x'+i.qty; }).join('<br>');
    var fmtDate= o.date ? o.date.split('-').reverse().join('/') : '-';
    return '<tr>'+
      '<td><code>#'+o.id+'</code><br><small style="color:var(--color-text-faint);">'+fmtDate+'</small></td>'+
      '<td>'+esc(o.customerName)+'<br><small style="color:var(--color-text-faint);">'+esc(o.customerPhone||'')+'</small></td>'+
      '<td style="max-width:180px;font-size:.8rem;">'+items+'</td>'+
      '<td><strong>'+window.ArkhivezProducts.formatRupiah(o.total)+'</strong></td>'+
      '<td>'+esc(o.paymentMethod||'-')+'</td>'+
      '<td><span class="badge '+sc.cls+'">'+sc.label+'</span></td>'+
      '<td><div class="action-cell">'+
        '<button class="btn-icon" data-action="detail-order" data-id="'+o.id+'" title="Detail">🔍</button>'+
        '<button class="btn-icon" data-action="edit-order"   data-id="'+o.id+'" title="Edit Status">✏️</button>'+
        '<button class="btn-icon" data-action="del-order"    data-id="'+o.id+'" data-name="'+o.id+'" title="Hapus" style="background:rgba(176,48,48,.08);">🗑️</button>'+
      '</div></td>'+
    '</tr>';
  }).join('');
}

/* ── Detail Pesanan ── */
async function openOrderDetail(id) {
  var o = await window.ArkhivezOrders.getById(id);
  if (!o) return showToast(' Pesanan tidak ditemukan.','error');
  var fmt  = window.ArkhivezProducts.formatRupiah;
  var sc   = statusConfig(o.status);
  var items= (o.items||[]).map(function(i,idx){
    return '<tr>'+
      '<td style="padding:.5rem .75rem;">'+(idx+1)+'</td>'+
      '<td style="padding:.5rem .75rem;">'+esc(i.productName)+'</td>'+
      '<td style="padding:.5rem .75rem;text-align:center;">'+i.qty+'</td>'+
      '<td style="padding:.5rem .75rem;text-align:right;">'+fmt(i.price)+'</td>'+
      '<td style="padding:.5rem .75rem;text-align:right;font-weight:600;">'+fmt(i.price*i.qty)+'</td>'+
    '</tr>';
  }).join('');

  var html =
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.25rem;">'+
      infoBox('ID Pesanan','#'+o.id)+
      infoBox('Tanggal',(o.date||'-').split('-').reverse().join('/'))+
      infoBox('Pelanggan',esc(o.customerName))+
      infoBox('Telepon',esc(o.customerPhone||'-'))+
      infoBox('Metode Bayar',esc(o.paymentMethod||'-'))+
      infoBox('Status','<span class="badge '+sc.cls+'">'+sc.label+'</span>')+
    '</div>'+
    '<div style="margin-bottom:1rem;padding:.75rem;background:var(--color-bg);border-radius:6px;">'+
      '<p style="font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:var(--color-text-muted);margin-bottom:.25rem;">Alamat Pengiriman</p>'+
      '<p style="font-size:.9rem;">'+esc(o.customerAddress||'-')+'</p>'+
    '</div>'+
    '<table style="width:100%;border-collapse:collapse;font-size:.85rem;margin-bottom:1rem;">'+
      '<thead><tr style="background:var(--color-bg);">'+
        '<th style="padding:.5rem .75rem;text-align:left;font-size:.7rem;letter-spacing:.1em;">No</th>'+
        '<th style="padding:.5rem .75rem;text-align:left;font-size:.7rem;letter-spacing:.1em;">Produk</th>'+
        '<th style="padding:.5rem .75rem;text-align:center;font-size:.7rem;letter-spacing:.1em;">Qty</th>'+
        '<th style="padding:.5rem .75rem;text-align:right;font-size:.7rem;letter-spacing:.1em;">Harga</th>'+
        '<th style="padding:.5rem .75rem;text-align:right;font-size:.7rem;letter-spacing:.1em;">Subtotal</th>'+
      '</tr></thead>'+
      '<tbody>'+items+'</tbody>'+
      '<tfoot><tr style="border-top:2px solid var(--color-bg);">'+
        '<td colspan="4" style="padding:.75rem;font-weight:600;text-align:right;">TOTAL</td>'+
        '<td style="padding:.75rem;font-weight:700;text-align:right;color:var(--color-gold);font-size:1.1rem;">'+fmt(o.total)+'</td>'+
      '</tr></tfoot>'+
    '</table>'+
    (o.notes?'<div style="padding:.75rem;background:#FFF9F0;border-left:3px solid var(--color-gold);border-radius:0 6px 6px 0;font-size:.85rem;"><strong>Catatan:</strong> '+esc(o.notes)+'</div>':'');

  document.getElementById('orderDetailBody').innerHTML = html;
  document.getElementById('orderDetailTitle').textContent = 'Detail Pesanan #'+o.id;

  var btnStatus = document.getElementById('btnDetailEditStatus');
  if (btnStatus) {
    btnStatus.onclick = function() {
      closeModal('orderDetailModal');
      openEditOrderModal(id);
    };
  }
  openModal('orderDetailModal');
}

/* ── Edit Pesanan ── */
function initOrderModal() {
  var form   = document.getElementById('orderForm');
  var btnAdd = document.getElementById('btnTambahPesanan');
  if (form) form.addEventListener('submit', function(e){ e.preventDefault(); saveOrder(); });
  if (btnAdd) btnAdd.addEventListener('click', openAddOrderModal);
  setupModalClose('orderModal', function(){ closeModal('orderModal'); });
  setupModalClose('orderDetailModal', function(){ closeModal('orderDetailModal'); });

  var btnAddItem = document.getElementById('btnAddOrderItem');
  if (btnAddItem) btnAddItem.addEventListener('click', function() { addOrderItemRow(); });
}

async function openAddOrderModal() {
  var f = document.getElementById('orderForm');
  if (f) f.reset();
  setVal('orderId','');
  setText2('orderModalTitle','Tambah Pesanan Baru');
  setText2('btnSaveOrder','Simpan Pesanan');

  fillCustomerSelect('ordCustomerId');

  var tbody = document.getElementById('orderItemsBody');
  if (tbody) { tbody.innerHTML = ''; addOrderItemRow(); }

  openModal('orderModal');
  focusEl('ordCustomerId');
}

async function openEditOrderModal(id) {
  var o = await window.ArkhivezOrders.getById(id);
  if (!o) return showToast('❌ Pesanan tidak ditemukan.','error');
  setText2('orderModalTitle','Edit Pesanan #'+o.id);
  setText2('btnSaveOrder','Perbarui Pesanan');
  setVal('orderId',o.id);

  fillCustomerSelect('ordCustomerId');
  setVal('ordCustomerId',  o.customerId||'manual');
  setVal('ordCustomerName',o.customerName||'');
  setVal('ordCustomerPhone',o.customerPhone||'');
  setVal('ordCustomerAddr',o.customerAddress||'');
  setVal('ordPayment',     o.paymentMethod||'Transfer Bank');
  setVal('ordStatus',      o.status||'diproses');
  setVal('ordNotes',       o.notes||'');

  var tbody = document.getElementById('orderItemsBody');
  if (tbody) {
    tbody.innerHTML = '';
    (o.items||[]).forEach(function(item) { addOrderItemRow(item); });
  }
  openModal('orderModal');
}
window.openEditOrderModal = openEditOrderModal;

async function fillCustomerSelect(selId) {
  var sel = document.getElementById(selId);
  if (!sel) return;
  var custs = await window.ArkhivezCustomers.getAll();
  sel.innerHTML = '<option value="">Pilih Pelanggan</option><option value="manual">Pelanggan Baru (isi manual)</option>';
  custs.forEach(function(c) {
    var opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name + ' — ' + (c.phone||'');
    sel.appendChild(opt);
  });
  
  sel.onchange = async function() {
    var cus = await window.ArkhivezCustomers.getById(this.value);
    if (cus) {
      setVal('ordCustomerName',  cus.name);
      setVal('ordCustomerPhone', cus.phone||'');
      setVal('ordCustomerAddr',  cus.address||'');
    } else if (this.value === 'manual') {
      setVal('ordCustomerName',''); setVal('ordCustomerPhone',''); setVal('ordCustomerAddr','');
    }
  };
}

async function addOrderItemRow(existingItem) {
  var tbody = document.getElementById('orderItemsBody');
  if (!tbody) return;
  var products = await window.ArkhivezProducts.getAll().filter(function(p){ return p.status==='aktif'; });
  var tr = document.createElement('tr');
  tr.className = 'order-item-row';

  var opts = products.map(function(p) {
    var sel = (existingItem && existingItem.productId===p.id) ? ' selected':'';
    return '<option value="'+p.id+'" data-price="'+p.price+'"'+sel+'>'+esc(p.name)+'</option>';
  }).join('');

  tr.innerHTML =
    '<td style="padding:.4rem .5rem;">'+
      '<select class="form-input item-product-sel" style="font-size:.82rem;padding:.35rem .5rem;">'+
        '<option value="">Pilih produk</option>'+opts+
      '</select>'+
    '</td>'+
    '<td style="padding:.4rem .5rem;width:80px;">'+
      '<input type="number" class="form-input item-qty" value="'+(existingItem?existingItem.qty:1)+'" min="1" style="font-size:.82rem;padding:.35rem .5rem;">'+
    '</td>'+
    '<td style="padding:.4rem .5rem;width:130px;">'+
      '<input type="number" class="form-input item-price" value="'+(existingItem?existingItem.price:0)+'" min="0" style="font-size:.82rem;padding:.35rem .5rem;">'+
    '</td>'+
    '<td style="padding:.4rem .5rem;width:110px;">'+
      '<span class="item-subtotal" style="font-size:.82rem;font-weight:600;">'+
        window.ArkhivezProducts.formatRupiah((existingItem?(existingItem.price*existingItem.qty):0))+
      '</span>'+
    '</td>'+
    '<td style="padding:.4rem .5rem;width:40px;">'+
      '<button type="button" class="btn-icon item-remove-btn" title="Hapus baris" style="background:rgba(176,48,48,.1);width:28px;height:28px;font-size:.8rem;">✕</button>'+
    '</td>';

  tbody.appendChild(tr);

  var sel   = tr.querySelector('.item-product-sel');
  var qty   = tr.querySelector('.item-qty');
  var price = tr.querySelector('.item-price');
  var sub   = tr.querySelector('.item-subtotal');

  function recalcSubtotal() {
    var s = (parseInt(qty.value,10)||0) * (parseInt(price.value,10)||0);
    sub.textContent = window.ArkhivezProducts.formatRupiah(s);
    recalcOrderTotal();
  }

  sel.addEventListener('change', function() {
    var opt = this.options[this.selectedIndex];
    var p   = opt ? (opt.dataset.price||0) : 0;
    price.value = p;
    recalcSubtotal();
  });
  qty.addEventListener('input',   recalcSubtotal);
  price.addEventListener('input', recalcSubtotal);

  tr.querySelector('.item-remove-btn').addEventListener('click', function() {
    tr.remove(); recalcOrderTotal();
  });

  recalcSubtotal();
}
window.addOrderItemRow = addOrderItemRow;

async function recalcOrderTotal() {
  var rows  = document.querySelectorAll('.order-item-row');
  var total = 0;
  rows.forEach(function(row) {
    var q = parseInt((row.querySelector('.item-qty')||{}).value||0,10)||0;
    var p = parseInt((row.querySelector('.item-price')||{}).value||0,10)||0;
    total += q*p;
  });
  setText('orderTotalPreview', window.ArkhivezProducts.formatRupiah(total));
}

async function saveOrder() {
  var id = getVal('orderId');
  var rows  = document.querySelectorAll('.order-item-row');
  var items = [];
  rows.forEach(function(row) {
    var selEl   = row.querySelector('.item-product-sel');
    var prodId  = selEl ? selEl.value : '';
    var prodOpt = selEl ? selEl.options[selEl.selectedIndex] : null;
    var prodName= prodOpt ? prodOpt.textContent : '';
    var qty     = parseInt((row.querySelector('.item-qty')||{}).value||0,10)||0;
    var price   = parseInt((row.querySelector('.item-price')||{}).value||0,10)||0;
    if (prodId && qty>0) items.push({ productId:prodId, productName:prodName, qty:qty, price:price });
  });

  var cusId = getVal('ordCustomerId');
  var data  = {
    customerId:      cusId !== 'manual' ? cusId : '',
    customerName:    getVal('ordCustomerName').trim(),
    customerPhone:   getVal('ordCustomerPhone').trim(),
    customerAddress: getVal('ordCustomerAddr').trim(),
    paymentMethod:   getVal('ordPayment'),
    status:          getVal('ordStatus'),
    notes:           getVal('ordNotes').trim(),
    items: items,
  };

  if (!data.customerName) return showToast('⚠️ Nama pelanggan wajib diisi.','error');
  if (!items.length)      return showToast('⚠️ Tambahkan minimal 1 produk.','error');

  var btn = document.getElementById('btnSaveOrder');
  setLoading(btn, true, 'Menyimpan...');

  (async function() {
    if (id) {
      await window.ArkhivezOrders.update(id, data);
      showToast('✓ Pesanan #'+id+' diperbarui!','success');
    } else {
      var newOrd = await window.ArkhivezOrders.add(data);
      showToast('✓ Pesanan #'+newOrd.id+' ditambahkan!','success');
      for (var _item of items) {
        var _prod = await window.ArkhivezProducts.getById(_item.productId);
        if (_prod) await window.ArkhivezProducts.patch(_item.productId, { stock: Math.max(0, _prod.stock - _item.qty) });
      }
    }
    closeModal('orderModal');
    renderOrderTable();
    updateDashboard();
    if (btn) { btn.disabled=false; btn.textContent='Simpan Pesanan'; }
  })();
}

/* ============================================================
   7. TABEL & CRUD PELANGGAN (Lanjutan Sempurna)
   ============================================================ */
var cusState = { search:'' };

function initCustomerTableListeners() {
  var btnAdd = document.getElementById('btnTambahPelanggan');
  if (btnAdd) btnAdd.addEventListener('click', openAddCustomerModal);
  debounceInput('customerSearch', function(v){ cusState.search=v; renderCustomerTable(); });
}

async function renderCustomerTable() {
  var tbody = document.getElementById('customerTableBody');
  if (!tbody) return;
  var list    = await window.ArkhivezCustomers.getAll();
  var orders  = await window.ArkhivezOrders.getAll();

  if (cusState.search) list = list.filter(function(c){
    return searchMatch(c.name+' '+(c.email||'')+' '+(c.phone||''), cusState.search);
  });

  setText('customerInfo','Total '+list.length+' pelanggan');
  if (!list.length) { tbody.innerHTML = emptyRow(8,'Tidak ada pelanggan ditemukan.'); return; }

  tbody.innerHTML = list.map(function(c,i) {
    var custOrders  = orders.filter(function(o){ return o.customerId===c.id; });
    var totalBelanja= custOrders.reduce(function(s,o){ return s+(o.total||0); },0);
    var joinDate    = c.joinedAt ? c.joinedAt.split('-').reverse().join('/') : '-';
    return '<tr>'+
      '<td style="color:var(--color-text-faint);font-size:.75rem;">'+(i+1)+'</td>'+
      '<td><strong>'+esc(c.name)+'</strong><br><small style="color:var(--color-text-faint);">'+c.id+'</small></td>'+
      '<td>'+esc(c.email||'-')+'</td>'+
      '<td>'+esc(c.phone||'-')+'</td>'+
      '<td style="text-align:center;"><button class="badge badge--aktif" data-action="cus-orders" data-id="'+c.id+'" data-name="'+esc(c.name)+'" style="cursor:pointer;border:none;">'+custOrders.length+' Transaksi</button></td>'+
      '<td><strong>'+window.ArkhivezProducts.formatRupiah(totalBelanja)+'</strong></td>'+
      '<td>'+joinDate+'</td>'+
      '<td><div class="action-cell">'+
        '<button class="btn-icon" data-action="edit-cus" data-id="'+c.id+'" title="Edit">✏️</button>'+
        '<button class="btn-icon" data-action="del-cus" data-id="'+c.id+'" data-name="'+esc(c.name)+'" title="Hapus" style="background:rgba(176,48,48,.08);">🗑️</button>'+
      '</div></td>'+
    '</tr>';
  }).join('');
}

function initCustomerModal() {
  var form = document.getElementById('customerForm');
  if (form) form.addEventListener('submit', function(e){ e.preventDefault(); saveCustomer(); });
  setupModalClose('customerModal', function(){ closeModal('customerModal'); });
  setupModalClose('cusOrdersModal', function(){ closeModal('cusOrdersModal'); });
}

async function openAddCustomerModal() {
  var f = document.getElementById('customerForm');
  if (f) f.reset();
  clearErrors();
  setVal('customerId','');
  setText2('customerModalTitle','Tambah Pelanggan Baru');
  setText2('btnSaveCustomer','Simpan Pelanggan');
  openModal('customerModal');
  focusEl('cusNama');
}

async function openEditCustomerModal(id) {
  var c = await window.ArkhivezCustomers.getById(id);
  if (!c) return showToast('❌ Data pelanggan tidak ditemukan.','error');
  clearErrors();
  setText2('customerModalTitle','Edit Pelanggan');
  setText2('btnSaveCustomer','Perbarui Pelanggan');
  setVal('customerId', c.id);
  setVal('cusNama', c.name);
  setVal('cusEmail', c.email||'');
  setVal('cusTelepon', c.phone||'');
  setVal('cusAlamat', c.address||'');
  openModal('customerModal');
  focusEl('cusNama');
}

async function saveCustomer() {
  var id = getVal('customerId');
  var data = {
    name: getVal('cusNama').trim(),
    email: getVal('cusEmail').trim(),
    phone: getVal('cusTelepon').trim(),
    address: getVal('cusAlamat').trim()
  };
  
  clearErrors();
  if (!data.name) return fieldError('cusNama', 'Nama pelanggan wajib diisi');

  var btn = document.getElementById('btnSaveCustomer');
  if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }

  if (id) {
      await window.ArkhivezCustomers.update(id, data);
      showToast('✓ Data pelanggan berhasil diperbarui!');
    } else {
      await window.ArkhivezCustomers.add(data);
      showToast('✓ Pelanggan baru berhasil didaftarkan!');
    }
  if (btn) { btn.disabled = false; btn.textContent = 'Simpan Pelanggan'; }
  closeModal('customerModal');
  renderCustomerTable();
  updateDashboard();
}

async function showCustomerOrders(id, name) {
  var modal = document.getElementById('cusOrdersModal');
  var body = document.getElementById('cusOrdersBody');
  var title = document.getElementById('cusOrdersTitle');
  if (!modal || !body) return;

  if (title) title.textContent = 'Riwayat Belanja: ' + name;
  var allOrders = await window.ArkhivezOrders.getAll();
  var orders = allOrders.filter(function(o) { return o.customerId === id; });

  if (!orders.length) {
    body.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--color-text-muted);">Pelanggan ini belum memiliki riwayat transaksi.</p>';
  } else {
    var fmt = window.ArkhivezProducts.formatRupiah;
    body.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:.85rem;">' +
      '<thead><tr style="background:var(--color-bg); font-size:.75rem;">' +
        '<th style="padding:.5rem;text-align:left;">ID</th>' +
        '<th style="padding:.5rem;text-align:left;">Tanggal</th>' +
        '<th style="padding:.5rem;text-align:left;">Produk</th>' +
        '<th style="padding:.5rem;text-align:right;">Total Belanja</th>' +
        '<th style="padding:.5rem;text-align:center;">Status</th>' +
      '</tr></thead>' +
      '<tbody>' + orders.map(function(o) {
        var sc = statusConfig(o.status);
        var items = o.items.map(function(i){ return i.productName + ' ('+i.qty+')'; }).join(', ');
        return '<tr style="border-bottom:1px solid var(--color-bg);">' +
          '<td style="padding:.6rem 0;"><code>#'+o.id+'</code></td>' +
          '<td>'+o.date.split('-').reverse().join('/')+'</td>' +
          '<td style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+esc(items)+'</td>' +
          '<td style="text-align:right;font-weight:600;">'+fmt(o.total)+'</td>' +
          '<td style="text-align:center;"><span class="badge '+sc.cls+'">'+sc.label+'</span></td>' +
        '</tr>';
      }).join('') + '</tbody></table>';
  }
  openModal('cusOrdersModal');
}

/* ============================================================
   8. LAPORAN — mengisi semua elemen yang benar
   ============================================================ */
async function renderReport() {
  var stats  = await window.ArkhivezStore.getKPI();
  var fmt    = window.ArkhivezProducts.formatRupiah;
  var orders = await window.ArkhivezOrders.getAll();
  var prods  = await window.ArkhivezProducts.getAll();

  // KPI Cards
  setText('rptRevenue',   fmt(stats.totalRevenue));
  setText('rptOrders',    stats.totalOrders);
  setText('rptCustomers', stats.totalCustomers);
  setText('rptAvgOrder',  fmt(stats.avgOrderValue));

  // Status breakdown
  var breakdown = document.getElementById('rptBreakdown');
  if (breakdown) {
    var rows = [
      {label:'Selesai',    count:stats.selesaiOrders,    cls:'badge--selesai'},
      {label:'Diproses',   count:stats.diprosesOrders,   cls:'badge--diproses'},
      {label:'Dikirim',    count:stats.dikirimOrders,    cls:'badge--dikirim'},
      {label:'Dibatalkan', count:stats.dibatalkanOrders, cls:'badge--danger'},
    ];
    var tot = stats.totalOrders || 1;
    breakdown.innerHTML = rows.map(function(r) {
      var pct = Math.round((r.count/tot)*100);
      return '<div style="margin-bottom:.85rem;">'+
        '<div style="display:flex;justify-content:space-between;margin-bottom:.3rem;">'+
          '<span class="badge '+r.cls+'">'+r.label+'</span>'+
          '<span style="font-size:.85rem;font-weight:600;">'+r.count+' <small style="color:var(--color-text-muted);">('+pct+'%)</small></span>'+
        '</div>'+
        '<div style="height:6px;background:#f0ede7;border-radius:3px;overflow:hidden;">'+
          '<div style="height:100%;width:'+pct+'%;background:var(--color-gold);border-radius:3px;"></div>'+
        '</div></div>';
    }).join('');
  }

  // Produk terlaris
  var topDiv = document.getElementById('rptTopProducts');
  if (topDiv) {
    var soldMap = {};
    orders.filter(function(o){return o.status==='selesai';}).forEach(function(o){
      (o.items||[]).forEach(function(item){
        soldMap[item.productId] = (soldMap[item.productId]||0) + item.qty;
      });
    });
    var sorted = Object.keys(soldMap)
      .map(function(id){return {id:id,qty:soldMap[id]};})
      .sort(function(a,b){return b.qty-a.qty;}).slice(0,5);
    if (!sorted.length) {
      topDiv.innerHTML = '<p style="color:var(--color-text-muted);font-size:.85rem;">Belum ada penjualan selesai.</p>';
    } else {
      /* Pra-fetch produk agar bisa dipakai di map (tidak perlu await per item) */
      var allProds = await window.ArkhivezProducts.getAll();
      var prodMapById = {};
      allProds.forEach(function(p){ prodMapById[p.id] = p; });
      var maxQ = sorted[0].qty||1;
      topDiv.innerHTML = sorted.map(function(s,i){
        var p   = prodMapById[s.id];
        var pct = Math.round((s.qty/maxQ)*100);
        return '<div style="margin-bottom:.85rem;">'+
          '<div style="display:flex;justify-content:space-between;margin-bottom:.3rem;">'+
            '<span style="font-size:.82rem;font-weight:500;">'+(i+1)+'. '+esc(p?p.name:s.id)+'</span>'+
            '<span style="font-size:.82rem;color:var(--color-gold);font-weight:600;">'+s.qty+' terjual</span>'+
          '</div>'+
          '<div style="height:6px;background:#f0ede7;border-radius:3px;overflow:hidden;">'+
            '<div style="height:100%;width:'+pct+'%;background:var(--color-gold);border-radius:3px;"></div>'+
          '</div></div>';
      }).join('');
    }
  }

  // Stok menipis di laporan
  var lowDiv = document.getElementById('rptLowStock');
  if (lowDiv) {
    var low = prods.filter(function(p){return p.status==='aktif' && p.stock<=5;});
    if (!low.length) {
      lowDiv.innerHTML = '<p style="color:var(--color-text-muted);font-size:.85rem;">✅ Semua produk stok aman.</p>';
    } else {
      lowDiv.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:.75rem;">'+
        low.map(function(p){
          var color = p.stock===0?'#c62828':'#E65100';
          return '<div style="padding:.75rem;border:1px solid '+color+';border-radius:6px;background:'+color+'0D;">'+
            '<p style="font-size:.82rem;font-weight:600;margin-bottom:.25rem;">'+esc(p.name)+'</p>'+
            '<p style="font-size:.75rem;color:'+color+';font-weight:700;">Stok: '+p.stock+(p.stock===0?' (Habis)':'')+'</p>'+
          '</div>';
        }).join('')+
      '</div>';
    }
  }

  // Tabel pesanan
  var tbody = document.getElementById('rptOrderTableBody');
  if (tbody) {
    if (!orders.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:var(--color-text-muted);">Belum ada pesanan.</td></tr>'; }
    else {
      tbody.innerHTML = orders.map(function(o){
        var sc = statusConfig(o.status);
        return '<tr>'+
          '<td><code>#'+o.id+'</code></td>'+
          '<td>'+(o.date||'-')+'</td>'+
          '<td>'+esc(o.customerName)+'</td>'+
          '<td>'+fmt(o.total)+'</td>'+
          '<td>'+esc(o.paymentMethod||'-')+'</td>'+
          '<td><span class="badge '+sc.cls+'">'+sc.label+'</span></td>'+
        '</tr>';
      }).join('');
    }
  }
}

/* ── Export CSV ── */
async function exportLaporanCSV() {
  var orders = await window.ArkhivezOrders.getAll();
  var rows   = [['ID','Tanggal','Pelanggan','Telepon','Alamat','Produk','Total','Pembayaran','Status']];
  orders.forEach(function(o){
    var items = (o.items||[]).map(function(i){return i.productName+'x'+i.qty;}).join(' | ');
    rows.push([o.id, o.date||'', o.customerName||'', o.customerPhone||'', o.customerAddress||'', items, o.total, o.paymentMethod||'', o.status]);
  });
  var csv = rows.map(function(r){
    return r.map(function(v){ return '"'+String(v).replace(/"/g,'""')+'"'; }).join(',');
  }).join('\n');
  var blob = new Blob(['﻿'+csv], {type:'text/csv;charset=utf-8;'});
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url; a.download = 'laporan-arkhivez-'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('✓ Laporan CSV berhasil diunduh!', 'success');
  logActivity('Export', 'Laporan pesanan diekspor ke CSV');
}

/* ── Export Print ── */
function exportLaporanPrint() {
  window.print();
  logActivity('Print', 'Halaman laporan dicetak');
}

/* ============================================================
   9. GLOBAL HELPERS & UTILITIES (Anti-Error Runtime)
   ============================================================ */
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function setText(id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; }
function setText2(id, txt) { var el = document.getElementById(id); if (el) el.innerHTML = txt; }
function setVal(id, val) { var el = document.getElementById(id); if (el) el.value = val; }
function getVal(id) { var el = document.getElementById(id); return el ? el.value : ''; }
function focusEl(id) { var el = document.getElementById(id); if (el) setTimeout(function() { el.focus(); }, 50); }

function openModal(id) { 
  var el = document.getElementById(id); 
  if (el) { el.hidden = false; el.classList.add('modal-overlay--open'); } 
}
function closeModal(id) { 
  var el = document.getElementById(id); 
  if (el) { el.hidden = true; el.classList.remove('modal-overlay--open'); } 
}

function setupModalClose(modalId, closeCb) {
  var modal = document.getElementById(modalId); if (!modal) return;
  modal.querySelectorAll('.modal-close').forEach(function(b){ b.addEventListener('click', closeCb); });
  modal.addEventListener('click', function(e){ if(e.target===modal) closeCb(); });
}

function setLoading(btn, isLoading, text) {
  if (!btn) return;
  btn.disabled = isLoading;
  btn.style.opacity = isLoading ? '0.7' : '1';
  btn.innerHTML = text;
}

function searchMatch(haystack, needle) {
  if (!haystack || !needle) return false;
  return haystack.toLowerCase().indexOf(needle.toLowerCase()) !== -1;
}

function emptyRow(colspan, text) {
  return '<tr><td colspan="'+colspan+'" style="text-align:center;padding:2.5rem;color:var(--color-text-muted);font-style:italic;">'+text+'</td></tr>';
}

function statusConfig(s) {
  var map = {
    'pending':   {cls:'badge--pending',   label:'Menunggu'},
    'diproses':  {cls:'badge--diproses',  label:'Diproses'},
    'dikirim':   {cls:'badge--dikirim',   label:'Dikirim'},
    'selesai':   {cls:'badge--selesai',   label:'Selesai'},
    'dibatalkan':{cls:'badge--danger',    label:'Dibatalkan'},
  };
  return map[s] || { cls:'', label: s||'-' };
}

function infoBox(title, value) {
  return '<div style="padding:.65rem;background:var(--color-surface);border:1px solid #e5e5e5;border-radius:4px;">'+
    '<p style="font-size:.72rem;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:2px;">'+title+'</p>'+
    '<p style="font-size:.9rem;font-weight:500;">'+value+'</p>'+
  '</div>';
}

function confirmDelete(type, id, name, onConfirm) {
  if (confirm('Apakah Anda yakin ingin menghapus ' + type + ' "' + name + '"?')) {
    onConfirm();
  }
}

/* ── Toast Notification System ── */
var toastTimer = null;
function showToast(message, type) {
  var toast = document.getElementById('toast');
  if (!toast) return;
  if (toastTimer) clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = 'toast show';
  if (type === 'error')   toast.classList.add('toast--error');
  if (type === 'success') toast.classList.add('toast--success');
  toastTimer = setTimeout(function() { toast.classList.remove('show'); }, 3000);
}

function debounceInput(id, cb) {
  var el = document.getElementById(id); if (!el) return;
  var t; el.addEventListener('input', function(){ clearTimeout(t); var v=this.value; t=setTimeout(function() { cb(v.trim().toLowerCase()); }, 300); });
}
function onChangeSelect(id, cb) {
  var el = document.getElementById(id); if (!el) return; el.addEventListener('change', function(){ cb(this.value); });
}

/* ── Validasi Error Form UI ── */
function fieldError(id, msg) {
  var el = document.getElementById(id); if (!el) return;
  el.classList.add('form-input--error');
  var old = el.parentElement && el.parentElement.querySelector('.field-error-msg'); if (old) old.remove();
  var p = document.createElement('p'); p.className = 'field-error-msg';
  p.style.cssText = 'color:var(--color-danger);font-size:.73rem;margin-top:3px;';
  p.textContent = '⚠ ' + msg;
  if (el.parentElement) el.parentElement.appendChild(p);
}
function clearErrors() {
  document.querySelectorAll('.form-input--error').forEach(function(e){ e.classList.remove('form-input--error'); });
  document.querySelectorAll('.field-error-msg').forEach(function(e){ e.remove(); });
}
/* ============================================================
   PROFIL ADMIN
   ============================================================ */
const ADMIN_PROFILE_KEY = 'arkhivez_admin_profile';

function openAdminProfileModal() {
  const session = window.ArkhivezAuth.getSession();
  if (!session) return;
  const modal = document.getElementById('adminProfileModal');
  if (!modal) return;

  const saved = JSON.parse(localStorage.getItem(ADMIN_PROFILE_KEY) || '{}');
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  set('adminProfName',  saved.name  || session.name);
  set('adminProfEmail', saved.email || session.email);

  /* Avatar */
  const circle = document.getElementById('adminAvatarCircle');
  if (circle) {
    if (saved.avatarImg) {
      circle.innerHTML = `<img src="${saved.avatarImg}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
    } else {
      const initials = (saved.name || session.name || 'AD').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
      circle.textContent = initials;
      circle.style.background = saved.avatarColor || '#B8960C';
    }
  }
  modal.hidden = false;
}
window.openAdminProfileModal = openAdminProfileModal;

window.saveAdminProfile = function() {
  const session = window.ArkhivezAuth.getSession();
  if (!session) return;

  const name  = (document.getElementById('adminProfName')  || {}).value || '';
  const email = (document.getElementById('adminProfEmail') || {}).value || '';
  const pwOld = (document.getElementById('adminPwOld') || {}).value || '';
  const pwNew = (document.getElementById('adminPwNew') || {}).value || '';

  if (!name.trim()) { showToast('⚠️ Nama tidak boleh kosong', 'error'); return; }

  const saved = JSON.parse(localStorage.getItem(ADMIN_PROFILE_KEY) || '{}');
  const update = Object.assign(saved, { name: name.trim(), email: email.trim() });

  if (pwNew) {
    if (!pwOld) { showToast('⚠️ Masukkan password lama', 'error'); return; }
    if (typeof ACCOUNTS !== 'undefined') {
      const acc = ACCOUNTS.find(a => a.username === session.username);
      if (acc && acc.password !== pwOld) { showToast('❌ Password lama salah', 'error'); return; }
      if (pwNew.length < 6) { showToast('⚠️ Password baru min. 6 karakter', 'error'); return; }
      if (acc) acc.password = pwNew;
    }
  }

  localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(update));

  /* Sync session name */
  const rawSession = JSON.parse(
    sessionStorage.getItem('arkhivez_session') ||
    localStorage.getItem('arkhivez_session') || '{}'
  );
  rawSession.name = name.trim();
  sessionStorage.setItem('arkhivez_session', JSON.stringify(rawSession));
  localStorage.setItem('arkhivez_session', JSON.stringify(rawSession));

  /* Update sidebar */
  const nameEl = document.getElementById('adminName');
  if (nameEl) nameEl.textContent = name.trim();

  document.getElementById('adminProfileModal').hidden = true;
  showToast('✓ Profil admin tersimpan!', 'success');
};

window.handleAdminAvatarUpload = function(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showToast('⚠️ Ukuran gambar maks. 2MB', 'error'); return; }
  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result;
    const circle = document.getElementById('adminAvatarCircle');
    if (circle) circle.innerHTML = `<img src="${base64}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
    const saved = JSON.parse(localStorage.getItem(ADMIN_PROFILE_KEY) || '{}');
    saved.avatarImg = base64;
    localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(saved));
    /* Update sidebar avatar */
    const sidebarAvatar = document.getElementById('adminSidebarAvatar');
    if (sidebarAvatar) sidebarAvatar.src = base64;
    showToast('✓ Foto profil diperbarui!', 'success');
  };
  reader.readAsDataURL(file);
};

/* ============================================================
   IMAGE UPLOAD + PREVIEW untuk form produk admin
   ============================================================ */
/* ── IMAGE PREVIEW & CLEAR ───────────────────────────────── */
window.previewProdImg = function(type, url) {
  var isMain  = type === 'main';
  var imgEl   = document.getElementById(isMain ? 'imgPreviewMainEl'  : 'imgPreviewHoverEl');
  var iconEl  = document.getElementById(isMain ? 'imgPreviewMainIcon': 'imgPreviewHoverIcon');
  var clearBtn= document.getElementById(isMain ? 'btnClearMain'       : 'btnClearHover');
  if (!imgEl) return;
  var hasImg = url && url.trim() !== '';
  if (hasImg) {
    imgEl.src = url.trim();
    imgEl.style.display = 'block';
    if (iconEl) iconEl.style.display = 'none';
    imgEl.onerror = function() {
      this.style.display = 'none';
      if (iconEl) iconEl.style.display = 'flex';
      if (clearBtn) clearBtn.style.display = 'none';
    };
  } else {
    imgEl.src = ''; imgEl.style.display = 'none';
    if (iconEl) iconEl.style.display = 'flex';
  }
  if (clearBtn) clearBtn.style.display = hasImg ? 'block' : 'none';
};

window.clearProdImg = function(type) {
  var urlId  = type === 'main' ? 'prodGambar' : 'prodGambarHover';
  var fileId = type === 'main' ? 'prodGambarFile' : 'prodGambarHoverFile';
  var u = document.getElementById(urlId);  if (u) u.value = '';
  var f = document.getElementById(fileId); if (f) f.value = '';
  window.previewProdImg(type, '');
};

window.handleImgUpload = function(type, input) {
  var file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('⚠ Ukuran gambar maks 5 MB', 'error'); return; }

  var reader = new FileReader();
  reader.onload = function(e) {
    /* Kompres gambar ke max 600px dan kualitas 70% agar hemat localStorage */
    var img = new Image();
    img.onload = function() {
      var MAX   = 600;
      var ratio = Math.min(MAX / img.width, MAX / img.height, 1);
      var w     = Math.round(img.width  * ratio);
      var h     = Math.round(img.height * ratio);
      var canvas= document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      var compressed = canvas.toDataURL('image/jpeg', 0.72);
      var urlId = type === 'main' ? 'prodGambar' : 'prodGambarHover';
      var u = document.getElementById(urlId); if (u) u.value = compressed;
      window.previewProdImg(type, compressed);
      /* Info ukuran setelah kompresi */
      var kb = Math.round(compressed.length * 0.75 / 1024);
      showToast('✓ Gambar dikompresi ke ~' + kb + ' KB', 'success');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

function resetImgPreview(type) { window.previewProdImg(type, ''); }

/* ── MULTI-DELETE PRODUK ─────────────────────────────────── */
var _selectedProdIds = new Set();

function _updateMultiBar() {
  var bar = document.getElementById('multiDeleteBar');
  var cnt = document.getElementById('selectedCount');
  if (bar) bar.style.display = _selectedProdIds.size > 0 ? 'flex' : 'none';
  if (cnt) cnt.textContent = _selectedProdIds.size;
}

(function initMultiDelete() {
  var tbody = document.getElementById('productTableBody');
  var allCb = document.getElementById('checkAllProds');
  var delBtn= document.getElementById('btnHapusTerpilih');

  if (allCb) {
    allCb.addEventListener('change', function() {
      document.querySelectorAll('.prod-row-cb').forEach(function(cb) {
        cb.checked = allCb.checked;
        if (allCb.checked) _selectedProdIds.add(cb.dataset.id);
        else _selectedProdIds.delete(cb.dataset.id);
      });
      _updateMultiBar();
    });
  }

  if (tbody) {
    tbody.addEventListener('change', function(e) {
      if (!e.target.classList.contains('prod-row-cb')) return;
      var id = e.target.dataset.id;
      if (e.target.checked) _selectedProdIds.add(id);
      else _selectedProdIds.delete(id);
      _updateMultiBar();
    });
  }

  if (delBtn) {
    delBtn.addEventListener('click', async function() {
      if (!_selectedProdIds.size) return;
      if (!confirm('Hapus ' + _selectedProdIds.size + ' produk terpilih? Tidak dapat dibatalkan.')) return;
      var count = 0;
      for (var _delId of _selectedProdIds) {
        if (await window.ArkhivezProducts.delete(_delId)) count++;
      }
      _selectedProdIds.clear();
      var allCb2 = document.getElementById('checkAllProds');
      if (allCb2) allCb2.checked = false;
      _updateMultiBar();
      renderProductTable();
      updateDashboard();
      showToast('🗑 ' + count + ' produk dihapus.', 'success');
    });
  }
})();

/* ============================================================
   FITUR BARU: NOTIFIKASI STOK MENIPIS
   ============================================================ */
async function checkLowStock() {
  var prods = await window.ArkhivezProducts.getAll();
  var low   = prods.filter(function(p){ return p.status==='aktif' && p.stock<=5; });
  var banner = document.getElementById('lowStockBanner');
  var msg    = document.getElementById('lowStockMsg');
  if (!banner) return;
  if (low.length) {
    var habis   = low.filter(function(p){return p.stock===0;}).length;
    var menipis = low.filter(function(p){return p.stock>0 && p.stock<=5;}).length;
    var txt     = [];
    if (habis)   txt.push(habis+' produk stok HABIS');
    if (menipis) txt.push(menipis+' produk stok menipis (≤5)');
    if (msg) msg.textContent = '⚠️ '+txt.join(', ')+'. Segera restok!';
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}

/* ============================================================
   FITUR BARU: BULK EDIT STATUS PRODUK
   ============================================================ */
(async function initBulkEdit() {
  var btn = document.getElementById('btnApplyBulk');
  var sel = document.getElementById('bulkStatusSel');
  if (!btn || !sel) return;
  btn.addEventListener('click', async function() {
    if (!_selectedProdIds.size) return showToast('⚠ Pilih produk terlebih dahulu.','error');
    var newStatus = sel.value;
    var count = 0;
    for (var _bId of _selectedProdIds) {
      await window.ArkhivezProducts.patch(_bId, {status: newStatus});
      count++;
    }
    _selectedProdIds.clear();
    document.querySelectorAll('.prod-row-cb').forEach(function(cb){ cb.checked=false; });
    var allCb = document.getElementById('checkAllProds');
    if (allCb) allCb.checked = false;
    var mdb = document.getElementById('multiDeleteBar');
    var beb = document.getElementById('bulkEditBar');
    if (mdb) mdb.style.display = 'none';
    if (beb) beb.style.display = 'none';
    document.getElementById('selectedCount').textContent = '0';
    renderProductTable();
    updateDashboard();
    showToast('✓ '+count+' produk diubah ke status "'+newStatus+'"','success');
    logActivity('Bulk Edit', count+' produk diubah ke status "'+newStatus+'"');
  });
})();

/* Update _updateMultiBar agar tampilkan bulkEditBar juga */
var _origUpdateMultiBar = _updateMultiBar;
_updateMultiBar = function() {
  var bar = document.getElementById('multiDeleteBar');
  var beb = document.getElementById('bulkEditBar');
  var cnt = document.getElementById('selectedCount');
  var hasSelected = _selectedProdIds.size > 0;
  if (bar) bar.style.display = hasSelected ? 'flex' : 'none';
  if (beb) beb.style.display = hasSelected ? 'flex' : 'none';
  if (cnt) cnt.textContent   = _selectedProdIds.size;
};

/* ============================================================
   FITUR BARU: LOG AKTIVITAS ADMIN
   ============================================================ */
var ACTIVITY_KEY = 'arkhivez_activity_log';

function logActivity(aksi, detail) {
  var session = window.ArkhivezAuth.getSession();
  var log = [];
  try { log = JSON.parse(localStorage.getItem(ACTIVITY_KEY)||'[]'); } catch(e){}
  var entry = {
    id:     Date.now(),
    aksi:   aksi,
    detail: detail,
    user:   session ? session.name : 'Admin',
    time:   new Date().toLocaleString('id-ID'),
  };
  log.unshift(entry);
  if (log.length > 100) log = log.slice(0,100); // max 100 entri
  try { localStorage.setItem(ACTIVITY_KEY, JSON.stringify(log)); } catch(e){}
}
window.logActivity = logActivity;

async function renderActivityLog() {
  var el = document.getElementById('activityLogList');
  if (!el) return;
  var log = [];
  try { log = JSON.parse(localStorage.getItem(ACTIVITY_KEY)||'[]'); } catch(e){}
  if (!log.length) {
    el.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--color-text-muted);">Belum ada aktivitas tercatat.</p>';
    return;
  }
  var iconMap = {
    'Tambah':'➕','Edit':'✏️','Hapus':'🗑️','Bulk Edit':'⚡','Export':'📥',
    'Print':'🖨️','Login':'🔐','Logout':'🚪','Pengaturan':'⚙️',
  };
  el.innerHTML = '<div style="display:flex;flex-direction:column;gap:0;">' +
    log.map(function(entry) {
      var icon = iconMap[entry.aksi] || '📋';
      return '<div style="display:flex;align-items:flex-start;gap:.85rem;padding:.85rem 1.5rem;border-bottom:1px solid var(--color-bg);">'+
        '<div style="width:34px;height:34px;border-radius:50%;background:var(--color-bg);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;">'+icon+'</div>'+
        '<div style="flex:1;min-width:0;">'+
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;">'+
            '<span style="font-size:.85rem;font-weight:600;">'+esc(entry.aksi)+'</span>'+
            '<span style="font-size:.72rem;color:var(--color-text-muted);white-space:nowrap;">'+esc(entry.time)+'</span>'+
          '</div>'+
          '<p style="font-size:.8rem;color:var(--color-text-muted);margin:.1rem 0 0;">'+esc(entry.detail)+'</p>'+
          '<p style="font-size:.72rem;color:var(--color-text-faint);margin:.1rem 0 0;">oleh '+esc(entry.user)+'</p>'+
        '</div>'+
      '</div>';
    }).join('') + '</div>';
}

window.clearActivityLog = function() {
  if (!confirm('Hapus semua log aktivitas?')) return;
  try { localStorage.removeItem(ACTIVITY_KEY); } catch(e){}
  renderActivityLog();
  showToast('✓ Log aktivitas dihapus.','success');
};

/* Tambah logActivity ke fungsi-fungsi yang sudah ada */
var _origSaveProduct = saveProduct;
var _origSaveCustomer = saveCustomer;

/* Hook: catat aktivitas produk, pesanan, pelanggan setelah disimpan */
// (dicatat langsung di saveProduct, saveOrder, saveCustomer via override berikut)

/* Tambahkan saveSetting */
window.saveSetting = function() {
  var s = {
    namaToko:  document.getElementById('settingNamaToko') ? document.getElementById('settingNamaToko').value.trim() : '',
    email:     document.getElementById('settingEmail')    ? document.getElementById('settingEmail').value.trim()    : '',
    wa:        document.getElementById('settingWA')       ? document.getElementById('settingWA').value.trim()       : '',
    alamat:    document.getElementById('settingAlamat')   ? document.getElementById('settingAlamat').value.trim()   : '',
    deskripsi: document.getElementById('settingDeskripsi')? document.getElementById('settingDeskripsi').value.trim(): '',
  };
  if (!s.namaToko) { showToast('⚠ Nama toko tidak boleh kosong.','error'); return; }
  try {
    localStorage.setItem('arkhivez_store_settings', JSON.stringify(s));
    showToast('✓ Pengaturan toko tersimpan!','success');
    logActivity('Pengaturan', 'Pengaturan toko diperbarui: "'+s.namaToko+'"');
  } catch(e) { showToast('❌ Gagal menyimpan.','error'); }
};

/* Load setting saat section pengaturan dibuka */
var _origShowSection = showSection;
showSection = function(name) {
  _origShowSection(name);
  if (name === 'pengaturan') {
    var s = {};
    try { s = JSON.parse(localStorage.getItem('arkhivez_store_settings')||'{}'); } catch(e){}
    var defaults = {namaToko:'ARKHIVEZ Store',email:'hello@arkhivez.id',wa:'+62 812-3456-7890',alamat:'Pekanbaru, Riau',deskripsi:'Fashion & Aksesoris Pria berkualitas.'};
    var merged   = Object.assign({},defaults,s);
    setVal('settingNamaToko',  merged.namaToko);
    setVal('settingEmail',     merged.email);
    setVal('settingWA',        merged.wa);
    setVal('settingAlamat',    merged.alamat);
    setVal('settingDeskripsi', merged.deskripsi);
  }
};
window.showSection = showSection;