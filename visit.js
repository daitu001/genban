/* ============ 版本更新 ============ */
var APP_VERSION = 'v20260810-10';
var UPDATE_LOG = [
    { ver: 'v20260810-10', time: '08-10 21:45', items: ['优先读云端数据', '任何设备打开都是同一份数据', '页面加载自动同步'] },
    { ver: 'v20260810-9', time: '08-10 21:10', items: ['拜访记录云端同步', '电脑填的手机也能看到', '数据实时共享，全员可见'] },
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
    var d = new Date(ds + 'T00:00:00');
    return Math.floor((t - d) / 86400000);
}
function visitRenderHistory() {
    var el = document.getElementById('visitHistoryList');
    if (!el) return;
    var all = hdGetDone();
    var today = new Date(); today.setHours(0,0,0,0);
    var todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
    var records = [];
    Object.keys(all).forEach(function(name) {
        var hist = (all[name] && all[name].history) || [];
        hist.forEach(function(h) {
            if (h.way === '拜访') {
                records.push({ name: name, date: h.date, time: h.time, who: h.who, contact_name: h.contact_name, contact_role: h.contact_role, text: h.text, next: h.next, next_visit_date: h.next_visit_date, isQuick: h.text === '首次拜访' });
            }
        });
    });
    // 按子tab筛选
    var filtered = [];
    if (visitSubTab === 'today') {
        // 今日：next_visit_date=今天 或 没填next_visit_date的（未排期）
        filtered = records.filter(function(r) {
            return r.next_visit_date === todayStr || !r.next_visit_date;
        });
        // 未排期排最后
        filtered.sort(function(a, b) {
            var aHas = a.next_visit_date ? 1 : 0;
            var bHas = b.next_visit_date ? 1 : 0;
            if (aHas !== bHas) return bHas - aHas;
            return (b.date + (b.time||'')).localeCompare(a.date + (a.time||''));
        });
    } else {
        // 下次：next_visit_date > 今天
        filtered = records.filter(function(r) {
            return r.next_visit_date && r.next_visit_date > todayStr;
        });
        filtered.sort(function(a, b) { return a.next_visit_date.localeCompare(b.next_visit_date); });
    }
    if (!filtered.length) {
        var msg = visitSubTab === 'today' ? '今日暂无安排' : '暂无下次拜访计划';
        el.innerHTML = '<div style="text-align:center;color:#bbb;padding:14px;font-size:12px">' + msg + '</div>';
        return;
    }
    el.innerHTML = filtered.slice(0, 20).map(function(r) {
        var icon = r.isQuick ? '🏠' : '💬';
        var label = r.isQuick ? '首次拜访' : (r.contact_role ? r.contact_role + '·' : '') + (r.contact_name ? r.contact_name + '·' : '') + (r.text||'').slice(0, 20);
        var schedule = '';
        if (visitSubTab === 'today' && !r.next_visit_date) {
            schedule = '<div style="font-size:11px;color:#999;margin-top:2px">⚪ 未排期</div>';
        } else if (visitSubTab === 'next') {
            schedule = '<div style="font-size:11px;color:#667eea;margin-top:2px">📆 ' + r.next_visit_date + '</div>';
        }
        return '<div style="padding:10px 0;border-bottom:1px solid #f5f5f5;cursor:pointer" onclick="visitShowModal(\'' + r.name.replace(/'/g, "\\'") + '\')">' +
            '<div style="font-size:13px;font-weight:600;color:#333">' + r.name + ' <span style="font-size:11px;color:#43a047">' + (r.who||'') + '</span></div>' +
            '<div style="font-size:12px;color:#666;margin-top:2px">' + icon + ' ' + label + '</div>' +
            '<div style="font-size:11px;color:#999;margin-top:2px">' + (r.date||'') + ' ' + (r.time||'') + '</div>' +
            schedule +
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
var visitSubTab = 'today';
function visitSwitchSubTab(tab) {
    visitSubTab = tab;
    var todayEl = document.getElementById('visitSubToday');
    var nextEl = document.getElementById('visitSubNext');
    if (tab === 'today') {
        todayEl.style.background = '#667eea'; todayEl.style.color = '#fff';
        nextEl.style.background = '#f5f5f5'; nextEl.style.color = '#666';
    } else {
        nextEl.style.background = '#667eea'; nextEl.style.color = '#fff';
        todayEl.style.background = '#f5f5f5'; todayEl.style.color = '#666';
    }
    visitRenderHistory();
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
        var last = visitGetLast(c.name);
        var info = '';
        var btn = '';
        if (last) {
            var days = visitDaysSince(last.date);
            var color = days <= 5 ? '#43a047' : '#f57c00';
            var bg = days <= 5 ? '#e8f5e9' : '#fff3e0';
            var who = last.contact_name ? last.contact_name : '';
            var role = last.contact_role ? last.contact_role : '';
            var label = who ? (role ? who + '·' + role : who) : '首次拜访';
            info = '<div style="font-size:11px;color:' + color + ';margin-top:3px">🏠 ' + label + '·' + days + '天前</div>';
        } else {
            btn = '<div style="background:#667eea;color:#fff;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer" onclick="event.stopPropagation();visitQuickCheckIn(\''+sn+'\')">+首次拜访</div>';
        }
        return '<div class="td-item" style="cursor:pointer" onclick="visitShowModal(\''+sn+'\')">' +
            '<div style="flex:1;min-width:0"><div class="td-name">' + c.name + ' <span style="font-size:11px;color:#999">' + c.grade + '</span></div>' + info + '</div>' +
            btn + '</div>';
    }).join('');
}
function visitQuickCheckIn(name) {
    var now = new Date();
    var today = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
    var all = hdGetDone();
    if (!all[name]) all[name] = { history: [] };
    if (!all[name].history) all[name].history = [];
    all[name].history.push({
        way: '拜访', text: '首次拜访', next: '', date: today,
        time: new Date().toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'}),
        who: localStorage.getItem('current_salesperson') || '',
        contact_name: '', contact_role: '', next_visit_date: ''
    });
    all[name].lastDone = { date: today, time: new Date().toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'}) };
    localStorage.setItem(hdKey(), JSON.stringify(all));
    // 云端同步
    if (typeof cloudSaveVisit === 'function') {
        cloudSaveVisit(name, {
            date: today,
            time: new Date().toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'}),
            who: localStorage.getItem('current_salesperson') || '',
            contact_name: '',
            contact_role: '',
            text: '首次拜访',
            next: '',
            next_visit_date: ''
        }).catch(function(e) { console.log('云端保存失败', e); });
    }
    visitRender();
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
    // 云端同步
    if (typeof cloudSaveVisit === 'function') {
        cloudSaveVisit(visitCurrent, {
            date: new Date().toISOString().slice(0,10),
            time: new Date().toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'}),
            who: localStorage.getItem('current_salesperson') || '',
            contact_name: document.getElementById('visitPerson').value.trim(),
            contact_role: document.getElementById('visitPosition').value.trim(),
            text: v,
            next: document.getElementById('visitNext').value.trim(),
            next_visit_date: document.getElementById('visitNextDate').value
        }).catch(function(e) { console.log('云端保存失败', e); });
    }
    visitClose(); visitRender(); visitRenderHistory();
}

// 初始化云开发并同步数据
if (typeof cloudInit === 'function') {
    cloudInit();
    // 延迟1秒后同步数据（等页面加载完）
    setTimeout(function() {
        if (typeof cloudSyncVisits === 'function') {
            cloudSyncVisits().then(function() {
                // 同步完成后刷新界面
                if (typeof visitRender === 'function') visitRender();
                if (typeof visitRenderHistory === 'function') visitRenderHistory();
            });
        }
        if (typeof cloudSyncFollowups === 'function') {
            cloudSyncFollowups();
        }
    }, 1000);
}

// ============ 跟进记录团队同步（SCF note → OSS activity_log.json） ============
// 业务组：同组共享，跨组隔离（刘老师可见全部）
var FOLLOWUP_GROUPS = {
    '超A组': ['灰姑娘', '只只'],
    'ABC组': ['小杰', '朵丹']
};
function getMyFollowupMembers() {
    var who = localStorage.getItem('current_salesperson') || '';
    for (var g in FOLLOWUP_GROUPS) {
        if (FOLLOWUP_GROUPS[g].indexOf(who) >= 0) return FOLLOWUP_GROUPS[g];
    }
    return null;  // 刘老师等管理员可见全部
}

// 从 OSS 拉取团队跟进记录合并到本地（按业务组过滤）
function syncFollowupsFromOSS() {
    fetch('https://youyi-01mishu.oss-cn-guangzhou.aliyuncs.com/genban/data/activity_log.json?t=' + Date.now())
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (!data || !data.logs || !data.logs.length) return;
            var members = getMyFollowupMembers();
            var all = hdGetDone();
            var merged = 0;
            data.logs.forEach(function(log) {
                if (log.action !== 'note' || !log.detail) return;
                try {
                    var rec = JSON.parse(log.detail);
                    // 复版专项跟进标记：全团队共享，不做业务组隔离
                    if (rec.type === 'followup_mark') {
                        // 跳过业务组过滤，直接处理
                    } else if (members && members.indexOf(rec.who) < 0) {
                        // 业务组隔离：只拉取同组成员的记录（null=管理员可见全部）
                        return;
                    }
                    // 类型1：跟进记录（hdSubmit 弹窗）
                    if (rec.type === 'followup' && rec.customer) {
                        var name = rec.customer;
                        if (!all[name]) all[name] = { history: [] };
                        if (!all[name].history) all[name].history = [];
                        // 去重：同客户+同日期+同时间+同内容
                        var exists = all[name].history.some(function(h) {
                            return h.date === rec.date && h.time === rec.time && h.text === rec.text;
                        });
                        if (!exists) {
                            all[name].history.push({
                                way: rec.way || '微信',
                                text: rec.text || '',
                                next: rec.next || '',
                                date: rec.date || '',
                                time: rec.time || '',
                                who: rec.who || log.who || '',
                                contact_name: rec.contact_name || '',
                                contact_role: rec.contact_role || '',
                                next_visit_date: rec.next_visit_date || ''
                            });
                            merged++;
                        }
                        // 更新 lastDone
                        if (!all[name].lastDone || (rec.date && rec.date > all[name].lastDone.date)) {
                            all[name].lastDone = { date: rec.date, time: rec.time };
                        }
                    }
                    // 类型2：复版专项跟进标记（saveFollowUp）—— 不按业务组隔离，全团队共享
                    if (rec.type === 'followup_mark' && rec.product && rec.customer) {
                        var k = 'followup_' + rec.product + '_' + rec.customer;
                        var kd = 'followup_date_' + rec.product + '_' + rec.customer;
                        // 只同步"已跟进"标记（取消标记只本地生效，避免误删）
                        if (rec.followed === '1' && localStorage.getItem(k) !== '1') {
                            localStorage.setItem(k, '1');
                            if (rec.date) localStorage.setItem(kd, rec.date + (rec.time ? ' ' + rec.time : '') + (rec.who ? ' ' + rec.who : ''));
                            merged++;
                        }
                    }
                } catch(e) {}
            });
            if (merged > 0) {
                localStorage.setItem(hdKey(), JSON.stringify(all));
                console.log('OSS跟进同步完成，新增 ' + merged + ' 条团队记录');
            }
        })
        .catch(function(e) { console.log('OSS跟进同步失败:', e); });
}
// 页面加载后自动同步一次（延迟到登录后执行，确保业务组过滤正确）
setTimeout(function() {
    if (localStorage.getItem('current_salesperson')) syncFollowupsFromOSS();
}, 3000);

var _origShowPageVisit2 = showPage;
showPage = function(id) { _origShowPageVisit2(id); if (id === 'visitPage') visitRender(); };
