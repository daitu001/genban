/* ============ 版本更新 ============ */
var APP_VERSION = 'v20260810-4';
var UPDATE_LOG = [
    { ver: 'v20260810-4', time: '08-10 14:00', items: ['拜访页加全部拜访记录区（全员可见）', '跟进弹窗加联系人姓名+角色', '待办列表显示跟进人+角色+日期'] },
    { ver: 'v20260810-3', time: '08-10 12:40', items: ['新增上门拜访页面', '拜访标签：5天内绿/超5天红', '右上角三横改为更新入口'] },
    { ver: 'v20260810-2', time: '08-10 11:55', items: ['待办按角色分栏'] },
    { ver: 'v20260810-1', time: '08-10 11:10', items: ['迁移GitHub Pages', '财神图标'] },
];
function checkUpdate() {
    document.getElementById('updVer').textContent = APP_VERSION;
    document.getElementById('updList').innerHTML = UPDATE_LOG.map(function(u) {
        return '<div class="td-modal-row"><div class="lbl">' + u.ver + '</div>' +
        u.items.map(function(it) { return '<div class="val" style="font-weight:400">· ' + it + '</div>'; }).join('') + '</div>';
    }).join('');
    document.getElementById('updateOverlay').classList.add('show');
}
function doForceRefresh() {
    var wrap = document.getElementById('updProgressWrap');
    var bar = document.getElementById('updProgressBar');
    var text = document.getElementById('updProgressText');
    var refreshBtn = document.getElementById('updRefreshBtn');
    var confirmBtn = document.getElementById('updConfirmBtn');
    if (wrap) wrap.style.display = 'block';
    if (refreshBtn) refreshBtn.style.display = 'none';
    var p = 0;
    var timer = setInterval(function() {
        p += 10;
        if (bar) bar.style.width = p + '%';
        if (text) text.textContent = '正在更新 ' + p + '%';
        if (p >= 100) {
            clearInterval(timer);
            if (text) text.textContent = '更新完成 ✅';
            if (confirmBtn) confirmBtn.style.display = 'block';
        }
    }, 200);
}
function doReload() { location.href = location.pathname + '?v=' + Date.now(); }

/* ============ 上门拜访 ============ */
var visitCurrent = null;
function visitAllCustomers() {
    var groups = (APP_DATA && APP_DATA.groups) || {};
    var out = [];
    Object.keys(groups).forEach(function(g) {
        (groups[g] || []).forEach(function(c) { out.push({ name: c.company, grade: g }); });
    });
    return out;
}
function visitGetLast(name) {
    var all = hdGetDone(); var rec = all[name];
    if (!rec || !rec.history) return null;
    var v = rec.history.filter(function(h) { return h.way === '拜访'; });
    return v.length ? v[v.length - 1] : null;
}
function visitDaysSince(ds) {
    if (!ds) return 999;
    var t = new Date(); t.setHours(0,0,0,0);
    return Math.floor((t - new Date(ds)) / 86400000);
}
function visitRenderHistory() {
    var el = document.getElementById('visitHistoryList');
    if (!el) return;
    var all = hdGetDone();
    var records = [];
    Object.keys(all).forEach(function(name) {
        var hist = (all[name] && all[name].history) || [];
        hist.forEach(function(h) {
            if (h.way === '拜访') {
                records.push({ name: name, date: h.date, time: h.time, who: h.who, contact_name: h.contact_name, contact_role: h.contact_role, text: h.text, next: h.next });
            }
        });
    });
    records.sort(function(a, b) { return (b.date + (b.time||'')).localeCompare(a.date + (a.time||'')); });
    if (!records.length) { el.innerHTML = '<div style="text-align:center;color:#bbb;padding:14px;font-size:12px">暂无拜访记录</div>'; return; }
    el.innerHTML = records.slice(0, 20).map(function(r) {
        return '<div style="padding:10px 0;border-bottom:1px solid #f5f5f5">' +
            '<div style="font-size:13px;font-weight:600;color:#333">' + r.name + ' <span style="font-size:11px;color:#43a047">' + (r.who||'') + (r.contact_role ? '·'+r.contact_role : '') + (r.contact_name ? '·'+r.contact_name : '') + '</span></div>' +
            '<div style="font-size:12px;color:#666;margin-top:2px">' + (r.text||'') + '</div>' +
            (r.next ? '<div style="font-size:11px;color:#667eea;margin-top:2px">→ ' + r.next + '</div>' : '') +
            '<div style="font-size:11px;color:#999;margin-top:2px">' + (r.date||'') + ' ' + (r.time||'') + '</div>' +
            '</div>';
    }).join('');
}
function visitRender() {
    var el = document.getElementById('visitList');
    if (!el) return;
    var q = (document.getElementById('visitSearch').value || '').trim();
    var all = visitAllCustomers();
    var matched = q ? all.filter(function(c) { return c.name.indexOf(q) >= 0; }) : all;
    var items = matched.map(function(c) {
        var last = visitGetLast(c.name);
        return { name: c.name, grade: c.grade, last: last, days: last ? visitDaysSince(last.date) : null };
    });
    var visited = items.filter(function(c) { return c.last; }).sort(function(a, b) { return b.days - a.days; });
    var notVisited = items.filter(function(c) { return !c.last; });
    var sorted = visited.concat(notVisited);
    if (!sorted.length) { el.innerHTML = '<div style="text-align:center;color:#bbb;padding:30px">没有匹配的客户</div>'; return; }
    el.innerHTML = sorted.map(function(c) {
        var tag = c.last
            ? '<span style="font-size:11px;padding:3px 8px;border-radius:10px;background:' + (c.days <= 5 ? '#e8f5e9;color:#43a047' : '#ffebee;color:#e53935') + ';font-weight:600">🏠 ' + c.days + '天没拜访</span>'
            : '<span style="font-size:11px;padding:3px 8px;border-radius:10px;background:#f5f5f5;color:#999">未拜访</span>';
        var sn = c.name.replace(/'/g, "\\'");
        return '<div class="td-item">' +
            '<div style="flex:1;cursor:pointer" onclick="visitShowDetail(\''+sn+'\')">' +
            '<div class="td-name">' + c.name + ' <span style="font-size:11px;color:#999">' + c.grade + '</span></div>' +
            '<div style="margin-top:3px">' + tag + '</div></div>' +
            '<div class="td-handover-btn" onclick="event.stopPropagation();visitOpen(\''+sn+'\')">+ 拜访</div></div>';
    }).join('');
    visitRenderHistory();
}
function visitOpen(name) {
    visitCurrent = name;
    document.getElementById('visitCustName').textContent = name;
    var groups = (APP_DATA && APP_DATA.groups) || {};
    var info = '';
    Object.keys(groups).forEach(function(g) {
        var f = (groups[g]||[]).find(function(c) { return c.company === name; });
        if (f) info = g + (f.total_amount ? ' · ¥' + Number(f.total_amount).toLocaleString() : '');
    });
    document.getElementById('visitCustInfo').textContent = info;
    var last = visitGetLast(name);
    var wrap = document.getElementById('visitLastWrap');
    if (last) {
        document.getElementById('visitLastLabel').textContent = '📌 上次（' + (last.date||'') + '）';
        var h = last.contact_name ? '👤 ' + last.contact_name + (last.contact_role ? '（'+last.contact_role+'）' : '') + '<br>' : '';
        h += '💬 ' + (last.text || '');
        if (last.next) h += '<br>→ ' + last.next;
        document.getElementById('visitLastContent').innerHTML = h;
        wrap.style.display = 'block';
    } else { wrap.style.display = 'none'; }
    ['visitPerson','visitPosition','visitText','visitNext','visitNextDate'].forEach(function(id) { document.getElementById(id).value = ''; });
    visitCheckInput();
    document.getElementById('visitOverlay').classList.add('show');
}
function visitClose() { document.getElementById('visitOverlay').classList.remove('show'); visitCurrent = null; }
function visitCheckInput() {
    var v = document.getElementById('visitText').value.trim();
    document.getElementById('visitOkBtn').className = 'hd-btn ok' + (v ? '' : ' disabled');
}
function visitSubmit() {
    var v = document.getElementById('visitText').value.trim();
    if (!v) { alert('必填：聊了什么'); return; }
    var all = hdGetDone();
    if (!all[visitCurrent]) all[visitCurrent] = { history: [] };
    if (!all[visitCurrent].history) all[visitCurrent].history = [];
    all[visitCurrent].history.push({
        way: '拜访', text: v,
        next: document.getElementById('visitNext').value.trim(),
        date: new Date().toISOString().slice(0,10),
        time: new Date().toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'}),
        who: localStorage.getItem('current_salesperson') || '',
        contact_name: document.getElementById('visitPerson').value.trim(),
        contact_role: document.getElementById('visitPosition').value.trim(),
        next_visit_date: document.getElementById('visitNextDate').value
    });
    all[visitCurrent].lastDone = { date: new Date().toISOString().slice(0,10), time: new Date().toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'}) };
    localStorage.setItem(hdKey(), JSON.stringify(all));
    visitClose(); visitRender(); visitRenderHistory();
}
function visitShowDetail(name) {
    var all = hdGetDone(); var rec = all[name];
    var visits = (rec && rec.history) ? rec.history.filter(function(h) { return h.way === '拜访'; }) : [];
    document.getElementById('visitDetailName').textContent = name;
    document.getElementById('visitDetailSub').textContent = '共 ' + visits.length + ' 次拜访';
    var body = document.getElementById('visitDetailBody');
    body.innerHTML = visits.length ? visits.slice().reverse().map(function(h) {
        return '<div class="td-modal-row"><div class="lbl">' + (h.date||'') + ' ' + (h.time||'') + '</div>' +
        (h.contact_name ? '<div class="val">👤 ' + h.contact_name + (h.contact_role ? '（'+h.contact_role+'）' : '') + '</div>' : '') +
        '<div class="val" style="font-weight:400">' + (h.text||'') + '</div>' +
        (h.next ? '<div style="font-size:12px;color:#667eea">→ ' + h.next + '</div>' : '') + '</div>';
    }).join('') : '<div style="text-align:center;color:#bbb;padding:20px">还没有拜访记录</div>';
    document.getElementById('visitDetailOverlay').classList.add('show');
}
var _origShowPageVisit2 = showPage;
showPage = function(id) { _origShowPageVisit2(id); if (id === 'visitPage') visitRender(); };
