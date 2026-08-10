/* ============ 腾讯云开发云端同步 ============ */
var TCB_ENV = 'cloud1-d3gej8ongbf4b4c3c';
var tcbApp = null;
var tcbDb = null;

// 初始化云开发
function cloudInit() {
    if (typeof cloudbase === 'undefined') {
        console.log('cloudbase SDK 未加载');
        return false;
    }
    tcbApp = cloudbase.init({ env: TCB_ENV });
    tcbDb = tcbApp.database();
    return true;
}

// 保存拜访记录到云端
function cloudSaveVisit(name, record) {
    if (!tcbDb) return Promise.reject('云开发未初始化');
    return tcbDb.collection('visits').add({
        name: name,
        date: record.date,
        time: record.time,
        who: record.who,
        contact_name: record.contact_name,
        contact_role: record.contact_role,
        text: record.text,
        next: record.next,
        next_visit_date: record.next_visit_date,
        created_at: new Date().toISOString()
    });
}

// 从云端读取拜访记录
function cloudLoadVisits(name) {
    if (!tcbDb) return Promise.reject('云开发未初始化');
    var query = tcbDb.collection('visits');
    if (name) query = query.where({ name: name });
    return query.orderBy('created_at', 'desc').limit(100).get();
}

// 保存跟进记录到云端
function cloudSaveFollowup(name, record) {
    if (!tcbDb) return Promise.reject('云开发未初始化');
    return tcbDb.collection('followups').add({
        name: name,
        way: record.way,
        text: record.text,
        next: record.next,
        date: record.date,
        time: record.time,
        who: record.who,
        contact_name: record.contact_name,
        contact_role: record.contact_role,
        next_visit_date: record.next_visit_date,
        created_at: new Date().toISOString()
    });
}

// 从云端读取跟进记录
function cloudLoadFollowups(name) {
    if (!tcbDb) return Promise.reject('云开发未初始化');
    var query = tcbDb.collection('followups');
    if (name) query = query.where({ name: name });
    return query.orderBy('created_at', 'desc').limit(100).get();
}
// 从云端拉取拜访记录并合并到本地
function cloudSyncVisits() {
    if (!tcbDb) return Promise.resolve();
    return cloudLoadVisits().then(function(res) {
        if (!res || !res.data || !res.data.length) return;
        var all = hdGetDone();
        res.data.forEach(function(doc) {
            var name = doc.name;
            if (!all[name]) all[name] = { history: [] };
            if (!all[name].history) all[name].history = [];
            // 检查是否已存在（避免重复）
            var exists = all[name].history.some(function(h) {
                return h.date === doc.date && h.time === doc.time && h.text === doc.text;
            });
            if (!exists) {
                all[name].history.push({
                    way: '拜访',
                    text: doc.text,
                    next: doc.next || '',
                    date: doc.date,
                    time: doc.time,
                    who: doc.who || '',
                    contact_name: doc.contact_name || '',
                    contact_role: doc.contact_role || '',
                    next_visit_date: doc.next_visit_date || ''
                });
            }
            // 更新 lastDone
            if (!all[name].lastDone || doc.date > all[name].lastDone.date) {
                all[name].lastDone = { date: doc.date, time: doc.time };
            }
        });
        localStorage.setItem(hdKey(), JSON.stringify(all));
        console.log('云端同步完成，拉取 ' + res.data.length + ' 条拜访记录');
    }).catch(function(e) {
        console.log('云端同步失败', e);
    });
}

// 从云端拉取跟进记录并合并到本地
function cloudSyncFollowups() {
    if (!tcbDb) return Promise.resolve();
    return cloudLoadFollowups().then(function(res) {
        if (!res || !res.data || !res.data.length) return;
        var all = hdGetDone();
        res.data.forEach(function(doc) {
            var name = doc.name;
            if (!all[name]) all[name] = { history: [] };
            if (!all[name].history) all[name].history = [];
            // 检查是否已存在
            var exists = all[name].history.some(function(h) {
                return h.date === doc.date && h.time === doc.time && h.text === doc.text;
            });
            if (!exists) {
                all[name].history.push({
                    way: doc.way || '微信',
                    text: doc.text,
                    next: doc.next || '',
                    date: doc.date,
                    time: doc.time,
                    who: doc.who || '',
                    contact_name: doc.contact_name || '',
                    contact_role: doc.contact_role || '',
                    next_visit_date: doc.next_visit_date || ''
                });
            }
        });
        localStorage.setItem(hdKey(), JSON.stringify(all));
        console.log('云端同步完成，拉取 ' + res.data.length + ' 条跟进记录');
    }).catch(function(e) {
        console.log('云端同步失败', e);
    });
}
