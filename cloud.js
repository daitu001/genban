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
