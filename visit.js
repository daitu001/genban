/* ============ 版本更新 ============ */
var APP_VERSION = 'v20260810-6';
var UPDATE_LOG = [
    { ver: 'v20260810-6', time: '08-10 19:25', items: ['拜访页顶部加两个tab：拜访群体/拜访记录', '拜访群体：搜索客户→点名字弹浮窗', '拜访记录：全部拜访记录列表'] },
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
function visitSwitchTab(tab) {
    var groupTab = document.getElementById('visitTabGroup');
    var recordTab = document.getElementById('visitTabRecord');
    var groupPanel = document.getElementById('visitGroupPanel');
    var recordPanel = document.getElementById('visitRecordPanel');
    if (tab === 'group') {
        groupTab.style.background = '#667eea'; groupTab.style.color = '#fff';
        recordTab.style.background = '#f5f5f5'; recordTab.style.color = '#666';
        groupPanel.style.display = 'block'; recordPanel.style.display = 'none';
    } else {
        recordTab.style.background = '#667eea'; recordTab.style.color = '#fff';
        groupTab.style.background = '#f5f5f5'; groupTab.style.color = '#666';
        groupPanel.style.display = 'none'; recordPanel.style.display = 'block';
        visitRenderHistory();
    }
}
function visitRender() {
    var el = document.getElementById('visitList');
    if (!el) return;
    var q = (document.getElementById('visitSearch').value || '').trim();
    var all = visitAllCustomers();
    var matched = q ? all.filter(function(c) { return c.name.indexOf(q) >= 0; }) : all;
    if (!matched.length) { el.innerHTML = '<div style="text-align:center;color:#bbb;padding:30px">没有匹配的客户</div>'; return; }
    el.innerHTML = matched.map(function(c) {
        var sn = c.name.replace(/'/g, "\\'");
        return '<div class="td-item" style="cursor:pointer" onclick="visitShowModal(\''+sn+'\')">' +
            '<div class="td-name">' + c.name + ' <span style="font-size:11px;color:#999">' + c.grade + '</span></div></div>';
    }).join('');
}
function visitShowModal(name) {
    var all = visitAllCustomers();
    var cur = all.find(function(c) { return c.name === name; });
    if (!cur) return;
    // 从 APP_DATA 取剪样/大货记录
    var samples = (APP_DATA.sample_products || []).filter(function(p) { return p.company === name; }).slice(0, 3);
    var cargos = (APP_DATA.cargo_products || []).filter(function(p) { return p.company === name; }).slice(0, 2);
    // 上次拜访
    var lastVisit = visitGetLast(name);
    var sn = name.replace(/'/g, "\\'");
    
    // 填充浮窗内容
    document.getElementById('visitModalName').textContent = name;
    document.getElementById('visitModalGrade').textContent = cur.grade + (cur.total_amount ? ' · ¥' + Number(cur.total_amount).toLocaleString() : '');
    
    // 剪样
    var sampleEl = document.getElementById('visitModalSamples');
    if (samples.length) {
        sampleEl.innerHTML = samples.map(function(s) {
            return '<div style="font-size:11px;color:#666;margin-bottom:3px"><span style="color:#999">' + (s.date||'').slice(5) + '</span> ' + (s.style_no||s.product_code||'') + '</div>';
        }).join('');
    } else { sampleEl.innerHTML = '<div style="font-size:11px;color:#bbb">暂无记录</div>'; }
    
    // 大货
    var cargoEl = document.getElementById('visitModalCargos');
    if (cargos.length) {
        cargoEl.innerHTML = cargos.map(function(c) {
            var h = '<div style="font-size:11px;color:#666;margin-bottom:3px"><span style="color:#999">' + (c.date||'').slice(5) + '</span> ' + (c.style_no||c.product_code||'') + '</div>';
            if (c.meters) h += '<div style="font-size:10px;color:#e65100;margin-left:30px">' + c.meters + '米</div>';
            return h;
        }).join('');
    } else { cargoEl.innerHTML = '<div style="font-size:11px;color:#bbb">暂无记录</div>'; }
    
    // 上次拜访
    var lastWrap = document.getElementById('visitModalLastWrap');
    if (lastVisit) {
        document.getElementById('visitModalLast').innerHTML = 
            '<div style="font-size:11px;color:#43a047">' + (lastVisit.date||'').slice(5) + ' ' + (lastVisit.who||'') + (lastVisit.contact_role ? '·'+lastVisit.contact_role : '') + (lastVisit.contact_name ? '·'+lastVisit.contact_name : '') + '</div>' +
            '<div style="font-size:12px;color:#666;margin-top:2px">' + (lastVisit.text||'') + '</div>' +
            (lastVisit.next ? '<div style="font-size:11px;color:#667eea;margin-top:2px">→ ' + lastVisit.next + '</div>' : '');
        lastWrap.style.display = 'block';
    } else { lastWrap.style.display = 'none'; }
    
    // 拜访记录
    var allRec = hdGetDone();
    var rec = allRec[name];
    var visits = (rec && rec.history) ? rec.history.filter(function(h) { return h.way === '拜访'; }) : [];
    var histEl = document.getElementById('visitModalHistory');
    if (visits.length) {
        histEl.innerHTML = visits.slice().reverse().slice(0, 3).map(function(h) {
            return '<div style="font-size:11px;color:#43a047">' + (h.date||'').slice(5) + ' ' + (h.who||'') + (h.contact_role ? '·'+h.contact_role : '') + (h.contact_name ? '·'+h.contact_name : '') + '</div>' +
                '<div style="font-size:11px;color:#666;margin:2px 0 6px">' + (h.text||'').slice(0, 30) + '...</div>';
        }).join('');
    } else { histEl.innerHTML = '<div style="font-size:11px;color:#bbb">暂无记录</div>'; }
    
    // 填写按钮绑定
    document.getElementById('visitModalFillBtn').onclick = function() { visitCloseModal(); visitOpen(name); };
    
    // 显示浮窗
    document.getElementById('visitModalOverlay').classList.add('show');
}
function visitCloseModal() {
    document.getElementById('visitModalOverlay').classList.remove('show');
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

var _origShowPageVisit2 = showPage;
showPage = function(id) { _origShowPageVisit2(id); if (id === 'visitPage') visitRender(); };
