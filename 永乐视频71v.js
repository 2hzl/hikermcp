/* ========= 永乐视频71v · 海阔视界规则 ========= */

var _H = 'https://www.71v.net';
var _UA = 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36';

function _hdr() {
    return { headers: { "User-Agent": _UA, "Referer": _H + "/" } };
}
function _full(u) {
    if (!u) return '';
    if (u.indexOf('http') === 0) return u;
    if (u.indexOf('//') === 0) return 'https:' + u;
    u = u.replace(/^\.?\//, '');
    return _H + '/' + u;
}
function _fetch(url) {
    try {
        return request(url, _hdr());
    } catch (e) {
        return "";
    }
}

/* ========= 统一列表解析 ========= */
/* 71v.net(AppleCMS) 结构：
   <a href="/voddetail/{id}/">标题</a>，同卡片常出现"正片/第X集"状态链接，
   封面为 data-original 懒加载 */
function parseList(html) {
    var d = [];
    var byVid = {};
    var re = /<a\s+([^>]*)href="([^"]*\/voddetail\/(\d+)\/[^"]*)"([^>]*)>([\s\S]*?)<\/a>/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
        var attrs = (m[1] || '') + (m[4] || '');
        var href = m[2];
        var vid = m[3];
        var inner = m[5] || '';

        /* 标题：优先 title 属性，其次 a 内文字 */
        var title = '';
        var tm = attrs.match(/title="([^"]*)"/);
        if (tm) title = tm[1];
        var innerText = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (!title && innerText) title = innerText;
        title = title.replace(/\s+/g, ' ').trim();
        if (!title) continue;

        /* 封面 */
        var pic = '';
        var full = attrs + inner;
        var pm = full.match(/data-original="([^"]*)"/);
        if (!pm) pm = full.match(/data-src="([^"]*)"/);
        if (!pm) pm = full.match(/src="([^"]*)"/);
        if (pm) pic = _full(pm[1]);

        /* 状态(正片/抢先版/第X集等)当作 desc，不作为标题 */
        var isStatus = /^(正片|抢先版|高清版|HD|超清|蓝光|更新至|完结|预告|花絮|共\d+集|全\d+集|第\d+集)/.test(title);

        var old = byVid[vid];
        if (!old) {
            byVid[vid] = { title: isStatus ? '' : title, desc: isStatus ? title : '', pic: pic, href: href };
        } else {
            if (isStatus) {
                if (!old.desc) old.desc = title;
            } else {
                if (!old.title || title.length > old.title.length) {
                    old.title = title;
                    old.href = href;
                }
            }
            if (!old.pic) old.pic = pic;
        }
    }
    for (var k in byVid) {
        var it = byVid[k];
        if (!it.title) continue;
        d.push({
            title: it.title,
            pic_url: it.pic,
            desc: it.desc,
            url: _full(it.href) + '#immersiveTheme#',
            col_type: 'movie_3'
        });
    }
    return d;
}

/* ========= 首页 / 分类 ========= */
function home() {
    var d = [];
    var pg = parseInt(MY_PAGE || '1', 10);
    var cat = getMyVar('c71', '');

    if (pg == 1) {
        var p = [];
        p.push({
            title: "搜索",
            desc: "输入片名搜索",
            url: "'hiker://search?rule=" + MY_RULE.title + "&s='+input",
            col_type: "input"
        });
        var cats = [
            { t: '首页', s: '' },
            { t: '电影', s: '1' },
            { t: '剧集', s: '2' },
            { t: '综艺', s: '3' },
            { t: '动漫', s: '4' }
        ];
        for (var i = 0; i < cats.length; i++) {
            (function (tn, tid) {
                p.push({
                    title: getMyVar('c71', '') == tid ? '「' + tn + '」' : tn,
                    url: $('#noLoading#').lazyRule(function (id) {
                        putMyVar('c71', id);
                        refreshPage(false);
                        return 'hiker://empty';
                    }, tid),
                    col_type: 'scroll_button'
                });
            })(cats[i].t, cats[i].s);
        }
        setPreResult(p);
    }

    var html;
    if (!cat) {
        if (pg > 1) { setResult([]); return; }
        html = _fetch(_H + '/');
    } else {
        html = _fetch(_H + '/vodshow/' + cat + '-----------' + (pg > 1 ? pg : '') + '/');
    }
    var list = parseList(html || '');
    if (!list.length) {
        if (pg == 1) d.push({ title: '暂无数据（可能被CF风控，稍后再试）', col_type: 'text_center_1' });
    }
    for (var k = 0; k < list.length; k++) d.push(list[k]);

    setResult(d);
}

/* ========= 搜索 ========= */
function search() {
    var kw = MY_KEYWORD || '';
    var d = [];
    if (!kw) { setResult(d); return; }
    var pg = parseInt(MY_PAGE || '1', 10);
    var url;
    if (pg == 1) {
        url = _H + '/vodsearch/-------------.html?wd=' + encodeURIComponent(kw);
    } else {
        url = _H + '/vodsearch/' + encodeURIComponent(kw) + '----------' + pg + '---/';
    }
    var html = _fetch(url);
    var list = parseList(html || '');
    if (!list.length) {
        if (pg == 1) d.push({ title: '没有找到"' + kw + '"相关影片', col_type: 'text_center_1' });
    }
    for (var i = 0; i < list.length; i++) d.push(list[i]);

    setResult(d);
}

/* ========= 详情页 ========= */
function detail() {
    var url = MY_URL || '';
    var m = url.match(/\/voddetail\/(\d+)/);
    var vid = m ? m[1] : '';
    var d = [];
    if (!vid) { setResult(d); return; }

    var res = _fetch(_H + '/voddetail/' + vid + '/');
    if (!res) { setError('详情页请求失败或被拦截'); setResult(d); return; }

    /* 标题 */
    var tTitle = '';
    var h1 = res.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    if (h1) tTitle = h1[1].replace(/<[^>]+>/g, '').replace(/^\s+|\s+$/g, '');
    if (!tTitle) tTitle = vid;
    setPageTitle(tTitle);

    /* 封面 */
    var cover = '';
    var cm = res.match(/data-original="([^"]+)"/);
    if (!cm) cm = res.match(/<img[^>]+src="([^"]+)"/);
    if (cm) cover = _full(cm[1]);

    /* 简介（best effort） */
    var intro = '';
    var im2 = res.match(/<p[^>]*class="[^"]*(?:content|detail|intro|desc)[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
    if (im2) intro = im2[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

    d.push({
        title: tTitle,
        pic_url: cover,
        url: cover ? (cover + '#.jpg#') : 'hiker://empty',
        col_type: 'movie_1_vertical_pic_blur'
    });
    if (intro) {
        d.push({
            title: '<b><font color="#098AC1">剧情简介</font></b><br>' + intro,
            col_type: 'rich_text',
            extra: { id: 'desc', lineSpacing: 6, textSize: 15, lineVisible: true }
        });
    }

    /* ===== 选集：按线路(sid)分组 ===== */
    var lineNames = {};
    var groups = {};
    var order = [];
    var playRe = /<a\s+([^>]*)href="([^"]*\/play\/(\d+)-(\d+)-(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    var am;
    while ((am = playRe.exec(res)) !== null) {
        var ahref = am[2];
        var avid = am[3];
        var sid = am[4];
        var nid = am[5];
        var atext = am[6].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (atext.indexOf('个视频') >= 0) {
            if (!lineNames[sid]) {
                lineNames[sid] = atext.replace(/\d+个视频/g, '').trim() || ('线路' + sid);
            }
            continue;
        }
        if (!atext) continue;
        var epName = atext;
        var dm = epName.match(/^第(\d+)集$/);
        if (dm) {
            var en = parseInt(dm[1], 10);
            epName = en < 10 ? '0' + en : '' + en;
        } else {
            var nm = epName.match(/^(\d+)$/);
            if (nm) {
                var nn = parseInt(nm[1], 10);
                epName = nn < 10 ? '0' + nn : '' + nn;
            }
        }
        if (!groups[sid]) { groups[sid] = []; order.push(sid); }
        groups[sid].push({ name: epName, nid: nid, vid: avid });
    }

    var allLines = [];
    for (var oi = 0; oi < order.length; oi++) {
        var sk = order[oi];
        var arr = groups[sk];
        if (!arr || !arr.length) continue;
        var seen = {};
        var eps = [];
        for (var ai = 0; ai < arr.length; ai++) {
            if (seen[arr[ai].nid]) continue;
            seen[arr[ai].nid] = true;
            eps.push({ name: arr[ai].name, url: _H + '/play/' + arr[ai].vid + '-' + sk + '-' + arr[ai].nid + '/' });
        }
        if (!eps.length) continue;
        var lname = lineNames[sk] || ('线路' + (oi + 1));
        allLines.push({ name: lname, eps: eps });
    }

    if (!allLines.length) {
        d.push({ title: '未解析到剧集（可能被CF风控）', col_type: 'text_center_1' });
        setResult(d);
        return;
    }

    var curLine = parseInt(getMyVar('c71_line', '0'), 10);
    if (curLine < 0 || curLine >= allLines.length) curLine = 0;
    var sortType = getMyVar('c71_sort', 'asc');

    /* 线路切换 */
    if (allLines.length > 1) {
        d.push({ col_type: 'line_blank' });
        for (var li = 0; li < allLines.length; li++) {
            (function (idx, nm) {
                d.push({
                    title: curLine == idx ? '「' + nm + '」' : nm,
                    url: $('#noLoading#').lazyRule(function (i) {
                        putMyVar('c71_line', String(i));
                        refreshPage(false);
                        return 'hiker://empty';
                    }, idx),
                    col_type: 'scroll_button'
                });
            })(li, allLines[li].name);
        }
    }

    /* 排序 */
    d.push({
        title: sortType == 'asc' ? '正序' : '倒序',
        url: $('#noLoading#').lazyRule(function (s) {
            putMyVar('c71_sort', s == 'asc' ? 'desc' : 'asc');
            refreshPage(false);
            return 'hiker://empty';
        }, sortType),
        col_type: 'flex_button'
    });
    d.push({ col_type: 'line_blank' });

    /* 当前线路剧集 */
    var eps = allLines[curLine].eps;
    if (sortType == 'desc') eps = eps.slice().reverse();
    var ct = eps.length > 20 ? 'text_4' : 'text_2';
    for (var ei = 0; ei < eps.length; ei++) {
        (function (ep) {
            d.push({
                title: ep.name,
                url: $('').lazyRule(function (pu) {
                    return playFromUrl(pu);
                }, ep.url),
                col_type: ct
            });
        })(eps[ei]);
    }

    setResult(d);
}

/* ========= 播放地址解析 ========= */
function playFromUrl(pu) {
    var ph = request(pu, _hdr());
    var real = '';
    var mm = ph.match(/var\s+player_aaaa\s*=\s*(\{[\s\S]*?\})\s*;/);
    if (mm) {
        try {
            var obj = JSON.parse(mm[1]);
            var u = obj && obj.url;
            if (u) {
                var enc = String(obj.encrypt || '0');
                if (enc == '1') { try { u = unescape(u); } catch (e) {} }
                else if (enc == '2') { try { if (typeof atob == 'function') u = unescape(atob(u)); } catch (e) {} }
                real = u;
            }
        } catch (e) {}
    }
    if (!real) {
        var m2 = ph.match(/https?:\/\/[^"'\s,)]+\.(?:m3u8|mp4|flv)(?:\?[^"'\s,)]*)?/i);
        if (m2) real = m2[0];
    }
    if (!real) {
        setError('播放地址解析失败:' + pu);
        return 'hiker://empty';
    }
    return real;
}

$.exports = { home: home, search: search, detail: detail };
