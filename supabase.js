/* ============================================================
   ARKHIVEZ STORE — supabase.js
   Koneksi database + semua fungsi CRUD
   ============================================================ */

var SUPA_URL = 'https://nscjvezepaneysnndxan.supabase.co';
var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zY2p2ZXplcGFuZXlzbm5keGFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyODk1NDAsImV4cCI6MjA5NTg2NTU0MH0.3-cO4RX_kyyAqZCQ1CGEv4HQt0og1jyYvbbx4U-xs84';

/* ── Helper fetch ke Supabase REST API ─────────────────────── */
async function sbFetch(table, options) {
  options = options || {};
  var method  = options.method  || 'GET';
  var query   = options.query   || '';
  var body    = options.body    || null;
  var headers = options.headers || {};

  var url = SUPA_URL + '/rest/v1/' + table + (query ? '?' + query : '');

  var reqHeaders = Object.assign({
    'apikey':        SUPA_KEY,
    'Authorization': 'Bearer ' + SUPA_KEY,
    'Content-Type':  'application/json',
    'Prefer':        method === 'POST' ? 'return=representation' : '',
  }, headers);

  var res = await fetch(url, {
    method:  method,
    headers: reqHeaders,
    body:    body ? JSON.stringify(body) : null,
  });

  if (!res.ok) {
    var err = await res.text();
    throw new Error('Supabase error ' + res.status + ': ' + err);
  }

  var text = await res.text();
  return text ? JSON.parse(text) : [];
}

/* ── Helper upload storage ─────────────────────────────────── */
async function sbUploadImage(bucket, filePath, file) {
  var url = SUPA_URL + '/storage/v1/object/' + bucket + '/' + filePath;
  var res = await fetch(url, {
    method:  'POST',
    headers: {
      'apikey':        SUPA_KEY,
      'Authorization': 'Bearer ' + SUPA_KEY,
    },
    body: file,
  });
  if (!res.ok) throw new Error('Upload gagal: ' + res.status);
  return SUPA_URL + '/storage/v1/object/public/' + bucket + '/' + filePath;
}

/* ============================================================
   PRODUK
   ============================================================ */
window.ArkhivezProducts = {

  formatRupiah: function(amount) {
    if (!amount || isNaN(amount)) return 'Rp 0';
    return 'Rp ' + Number(amount).toLocaleString('id-ID');
  },

  calculateDiscount: function(price, priceOri) {
    if (!priceOri || priceOri <= price) return 0;
    return Math.round(((priceOri - price) / priceOri) * 100);
  },

  getAll: async function() {
    var rows = await sbFetch('products', { query: 'order=created_at.asc' });
    return rows.map(window.ArkhivezProducts._map);
  },

  getById: async function(id) {
    var rows = await sbFetch('products', { query: 'id=eq.' + encodeURIComponent(id) + '&limit=1' });
    return rows[0] ? window.ArkhivezProducts._map(rows[0]) : null;
  },

  getByCategory: async function(category, subCategory) {
    var q = 'category=eq.' + encodeURIComponent(category) + '&status=eq.aktif&order=created_at.asc';
    if (subCategory && subCategory !== 'all') {
      q += '&sub_category=eq.' + encodeURIComponent(subCategory);
    }
    var rows = await sbFetch('products', { query: q });
    /* Map snake_case → camelCase untuk kompatibilitas frontend */
    return rows.map(window.ArkhivezProducts._map);
  },

  add: async function(data) {
    var row = window.ArkhivezProducts._toRow(data);
    /* Generate ID */
    var all = await sbFetch('products', { query: 'select=id&order=id.desc&limit=1' });
    var maxNum = 0;
    if (all.length) {
      var n = parseInt((all[0].id || '').replace('PROD-', ''), 10);
      if (!isNaN(n)) maxNum = n;
    }
    row.id         = 'PROD-' + String(maxNum + 1).padStart(3, '0');
    row.brand      = 'ARKHIVEZ';
    row.status     = row.status || 'aktif';
    row.created_at = new Date().toISOString().split('T')[0];
    var result = await sbFetch('products', { method: 'POST', body: row });
    return window.ArkhivezProducts._map(Array.isArray(result) ? result[0] : result);
  },

  update: async function(id, data) {
    var row = window.ArkhivezProducts._toRow(data);
    delete row.id;
    delete row.created_at;
    row.brand = 'ARKHIVEZ';
    var result = await sbFetch('products', {
      method:  'PATCH',
      query:   'id=eq.' + encodeURIComponent(id),
      headers: { 'Prefer': 'return=representation' },
      body:    row,
    });
    var updated = Array.isArray(result) ? result[0] : result;
    return window.ArkhivezProducts._map(updated);
  },

  patch: async function(id, partial) {
    var row = window.ArkhivezProducts._toRow(partial);
    delete row.id;
    await sbFetch('products', {
      method: 'PATCH',
      query:  'id=eq.' + encodeURIComponent(id),
      body:   row,
    });
  },

  delete: async function(id) {
    await sbFetch('products', {
      method: 'DELETE',
      query:  'id=eq.' + encodeURIComponent(id),
    });
    return true;
  },

  /* camelCase → snake_case untuk database */
  _toRow: function(d) {
    var row = {};
    if (d.id          !== undefined) row.id           = d.id;
    if (d.name        !== undefined) row.name         = d.name;
    if (d.brand       !== undefined) row.brand        = d.brand;
    if (d.category    !== undefined) row.category     = d.category;
    if (d.subCategory !== undefined) row.sub_category = d.subCategory;
    if (d.price       !== undefined) row.price        = d.price;
    if (d.priceOri    !== undefined) row.price_ori    = d.priceOri;
    if (d.stock       !== undefined) row.stock        = d.stock;
    if (d.badge       !== undefined) row.badge        = d.badge;
    if (d.status      !== undefined) row.status       = d.status;
    if (d.fitType     !== undefined) row.fit_type     = d.fitType;
    if (d.material    !== undefined) row.material     = d.material;
    if (d.sizes       !== undefined) row.sizes        = d.sizes;
    if (d.description !== undefined) row.description  = d.description;
    if (d.image       !== undefined) row.image        = d.image;
    if (d.imageHover  !== undefined) row.image_hover  = d.imageHover;
    if (d.created_at  !== undefined) row.created_at   = d.created_at;
    return row;
  },

  /* snake_case → camelCase untuk frontend */
  _map: function(r) {
    if (!r) return r;
    return {
      id:          r.id,
      name:        r.name,
      brand:       r.brand,
      category:    r.category,
      subCategory: r.sub_category,
      price:       r.price,
      priceOri:    r.price_ori,
      stock:       r.stock,
      badge:       r.badge,
      status:      r.status,
      fitType:     r.fit_type,
      material:    r.material,
      sizes:       r.sizes || [],
      description: r.description,
      image:       r.image,
      imageHover:  r.image_hover,
      createdAt:   r.created_at,
    };
  },
};
window.MankutuProducts = window.ArkhivezProducts;

/* ============================================================
   PESANAN
   ============================================================ */
window.ArkhivezOrders = {

  getAll: async function() {
    var rows = await sbFetch('orders', { query: 'order=created_at.desc' });
    return rows.map(window.ArkhivezOrders._map);
  },

  getById: async function(id) {
    var rows = await sbFetch('orders', { query: 'id=eq.' + encodeURIComponent(id) + '&limit=1' });
    return rows[0] ? window.ArkhivezOrders._map(rows[0]) : null;
  },

  add: async function(data) {
    var all    = await sbFetch('orders', { query: 'select=id&order=created_at.desc&limit=1' });
    var maxNum = 0;
    if (all.length) {
      var n = parseInt((all[0].id || '').replace('MNK-', ''), 10);
      if (!isNaN(n)) maxNum = n;
    }
    var total = (data.items || []).reduce(function(s, i) { return s + (i.price * i.qty); }, 0);
    var row = {
      id:               'MNK-' + String(maxNum + 1).padStart(3, '0'),
      date:             new Date().toISOString().split('T')[0],
      customer_id:      data.customerId      || '',
      customer_name:    data.customerName    || '',
      customer_phone:   data.customerPhone   || '',
      customer_address: data.customerAddress || '',
      items:            data.items           || [],
      total:            total,
      payment_method:   data.paymentMethod   || '',
      status:           data.status          || 'diproses',
      notes:            data.notes           || '',
      created_at:       new Date().toISOString(),
    };
    var result = await sbFetch('orders', { method: 'POST', body: row });
    return window.ArkhivezOrders._map(Array.isArray(result) ? result[0] : result);
  },

  update: async function(id, data) {
    var row = {};
    if (data.customerName    !== undefined) row.customer_name    = data.customerName;
    if (data.customerPhone   !== undefined) row.customer_phone   = data.customerPhone;
    if (data.customerAddress !== undefined) row.customer_address = data.customerAddress;
    if (data.paymentMethod   !== undefined) row.payment_method   = data.paymentMethod;
    if (data.status          !== undefined) row.status           = data.status;
    if (data.notes           !== undefined) row.notes            = data.notes;
    if (data.items           !== undefined) {
      row.items = data.items;
      row.total = data.items.reduce(function(s, i) { return s + (i.price * i.qty); }, 0);
    }
    var result = await sbFetch('orders', {
      method:  'PATCH',
      query:   'id=eq.' + encodeURIComponent(id),
      headers: { 'Prefer': 'return=representation' },
      body:    row,
    });
    return window.ArkhivezOrders._map(Array.isArray(result) ? result[0] : result);
  },

  delete: async function(id) {
    await sbFetch('orders', { method: 'DELETE', query: 'id=eq.' + encodeURIComponent(id) });
    return true;
  },

  _map: function(r) {
    if (!r) return r;
    return {
      id:              r.id,
      date:            r.date,
      customerId:      r.customer_id,
      customerName:    r.customer_name,
      customerPhone:   r.customer_phone,
      customerAddress: r.customer_address,
      items:           r.items || [],
      total:           r.total,
      paymentMethod:   r.payment_method,
      status:          r.status,
      notes:           r.notes,
      createdAt:       r.created_at,
    };
  },
};
window.MankutuOrders = window.ArkhivezOrders;

/* ============================================================
   PELANGGAN
   ============================================================ */
window.ArkhivezCustomers = {

  getAll: async function() {
    return await sbFetch('customers', { query: 'order=joined_at.asc' });
  },

  getById: async function(id) {
    var rows = await sbFetch('customers', { query: 'id=eq.' + encodeURIComponent(id) + '&limit=1' });
    return rows[0] || null;
  },

  add: async function(data) {
    var all    = await sbFetch('customers', { query: 'select=id&order=joined_at.desc&limit=100' });
    var maxNum = all.reduce(function(max, c) {
      var n = parseInt((c.id || '').replace('CUS-', ''), 10);
      return isNaN(n) ? max : Math.max(max, n);
    }, 0);
    var row = {
      id:        'CUS-' + String(maxNum + 1).padStart(3, '0'),
      name:      data.name    || '',
      email:     data.email   || '',
      phone:     data.phone   || '',
      address:   data.address || '',
      joined_at: new Date().toISOString().split('T')[0],
    };
    var result = await sbFetch('customers', { method: 'POST', body: row });
    return Array.isArray(result) ? result[0] : result;
  },

  update: async function(id, data) {
    var row = {};
    if (data.name    !== undefined) row.name    = data.name;
    if (data.email   !== undefined) row.email   = data.email;
    if (data.phone   !== undefined) row.phone   = data.phone;
    if (data.address !== undefined) row.address = data.address;
    var result = await sbFetch('customers', {
      method:  'PATCH',
      query:   'id=eq.' + encodeURIComponent(id),
      headers: { 'Prefer': 'return=representation' },
      body:    row,
    });
    return Array.isArray(result) ? result[0] : result;
  },

  delete: async function(id) {
    await sbFetch('customers', { method: 'DELETE', query: 'id=eq.' + encodeURIComponent(id) });
    return true;
  },
};
window.MankutuCustomers = window.ArkhivezCustomers;

/* ============================================================
   STATISTIK / KPI
   ============================================================ */
window.ArkhivezStore = {
  getKPI: async function() {
    var orders    = await window.ArkhivezOrders.getAll();
    var customers = await window.ArkhivezCustomers.getAll();
    var products  = await window.ArkhivezProducts.getAll();

    var totalRevenue = 0, selesai = 0, diproses = 0, dikirim = 0, dibatalkan = 0;
    orders.forEach(function(o) {
      if (o.status === 'selesai')     { totalRevenue += o.total; selesai++; }
      else if (o.status === 'diproses')    diproses++;
      else if (o.status === 'dikirim')     dikirim++;
      else if (o.status === 'dibatalkan')  dibatalkan++;
    });

    return {
      totalRevenue:       totalRevenue,
      totalOrders:        orders.length,
      selesaiOrders:      selesai,
      diprosesOrders:     diproses,
      dikirimOrders:      dikirim,
      dibatalkanOrders:   dibatalkan,
      totalActiveProducts:products.filter(function(p){return p.status==='aktif';}).length,
      totalCustomers:     customers.length,
      avgOrderValue:      selesai > 0 ? Math.round(totalRevenue / selesai) : 0,
    };
  },
};
window.MankutuStore = window.ArkhivezStore;

/* ============================================================
   LOG AKTIVITAS
   ============================================================ */
window.logActivity = async function(aksi, detail) {
  var session = window.ArkhivezAuth ? window.ArkhivezAuth.getSession() : null;
  try {
    await sbFetch('activity_log', {
      method: 'POST',
      body: {
        aksi:      aksi,
        detail:    detail,
        username:  session ? session.username : 'unknown',
        user_name: session ? session.name     : 'Unknown',
      },
    });
  } catch(e) { /* log tidak boleh crash app */ }
};

/* ============================================================
   AKUN LOGIN
   ============================================================ */
window.ArkhivezAccounts = {
  findByUsername: async function(username) {
    var rows = await sbFetch('accounts', {
      query: 'username=eq.' + encodeURIComponent(username.toLowerCase()) + '&limit=1',
    });
    return rows[0] || null;
  },
};