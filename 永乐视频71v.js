//js:
/* ========= 永乐视频71v · 海阔视界规则（短行版） ========= */

var qy71v = {
    host: 'https://www.71v.net',
    ua: 'Mozilla/5.0 (Linux; Android 12)',
    d: [],
    d_: [],
    author: 'AI',
    title: '永乐视频71v',
    version: 1,

    /* ===== 基础工具 ===== */
    hdr: function() {
        return { headers: { 'User-Agent': this.ua } };
    },

    full: function(u) {
        if (!u) return '';
        if (u.indexOf('http') === 0) return u;
        if (u.indexOf('//') === 0) return 'https:' + u;
        u = u.replace(new RegExp('^\\.?/'), '');
        return this.host + '/' + u;
    },

    fetch: function(url) {
        try {
            return request(url, this.hdr());
        } catch (e) {
            return '';
        }
    },

    /* ===== 统一列表解析 ===== */
    parseList: function(html) {
        var self = this;
        var out = [];
        var byVid = {};
        var re = new RegExp(
            '<a\\s+([^>]*)href="([^"]*/voddetail/(\\d+)/[^"]*)"' +
            '([^>]*)>([\\s\\S]*?)</a>', 'gi');
        var m;
        while ((m = re.exec(html)) !== null) {
            var attrs = (m[1] || '') + (m[4] || '');
            var href = m[2];
            var vid = m[3];
            var inner = m[5] || '';
            var title = '';

            var tm = attrs.match(new RegExp('title="([^"]*)"'));
            if (tm) title = tm[1];
            var innerText = inner.replace(
                new RegExp('<[^>]+>', 'g'), ' ');
            innerText = innerText.replace(
                new RegExp('\\s+', 'g'), ' ').trim();
            if (!title && innerText) title = innerText;
            title = title.replace(
                new RegExp('\\s+', 'g'), ' ').trim();
            if (!title) continue;

            var pic = '';
            var fullTxt = attrs + inner;
            var pm = fullTxt.match(
                new RegExp('data-original="([^"]*)"'));
            if (!pm) pm = fullTxt.match(
                new RegExp('data-src="([^"]*)"'));
            if (!pm) pm = fullTxt.match(
                new RegExp('src="([^"]*)"'));
            if (pm) pic = self.full(pm[1]);

            var isStatus = new RegExp(
                '^(正片|抢先版|高清版|HD|超清|蓝光|更新至|完结|' +
                '预告|花絮|共\\d+集|全\\d+集|第\\d+集)')
                .test(title);

            var old = byVid[vid];
            if (!old) {
                byVid[vid] = {
                    title: isStatus ? '' : title,
                    desc: isStatus ? title : '',
                    pic: pic,
                    href: href
                };
            } else {
                if (isStatus) {
                    if (!old.desc) old.desc = title;
                } else {
                    if (!old.title ||
                        title.length > old.title.length) {
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
            var idm = it.href.match(
                new RegExp('/voddetail/(\\d+)'));
            out.push({
                title: it.title,
                img: it.pic,
                desc: it.desc,
                col_type: 'movie_3',
                url: $('hiker://empty').rule(function(o) {
                    putMyVar('vod_id', o.vod_id);
                    putMyVar('vod_name', o.vod_name);
                    $.require('qy71v').detail();
                }, {
                    vod_id: idm ? idm[1] : '',
                    vod_name: it.title
                })
            });
        }
        return out;
    },

    /* ===== 首页 / 分类 ===== */
    home: function() {
        var self = this;
        var d = this.d = [];
        var d_ = this.d_ = [];
        var pg = typeof MY_PAGE !== 'undefined' ?
            parseInt(MY_PAGE, 10) : 1;
        if (isNaN(pg) || pg < 1) pg = 1;

        if (pg == 1) {
            d_.push({
                title: '搜索',
                col_type: 'input',
                extra: {
                    onChange: $.toString(function(v) {
                        putMyVar('keyword', v);
                        $.require('qy71v').search();
                    })
                }
            });
            var cats = [
                { t: '首页', s: '' },
                { t: '电影', s: '1' },
                { t: '剧集', s: '2' },
                { t: '综艺', s: '3' },
                { t: '动漫', s: '4' }
            ];
            for (var i = 0; i < cats.length; i++) {
                (function(tn, tid) {
                    d_.push({
                        title: getMyVar('c71', '') == tid ?
                            '「' + tn + '」' : tn,
                        url: $('#noLoading#').lazyRule(
                            function(id) {
                                putMyVar('c71', id);
                                refreshPage(false);
                                return 'hiker://empty';
                            }, tid),
                        col_type: 'scroll_button'
                    });
                })(cats[i].t, cats[i].s);
            }
            setPreResult(d_);
        }

        var cat = getMyVar('c71', '');
        var html;
        if (!cat) {
            if (pg > 1) { setResult(d); return; }
            html = self.fetch(self.host + '/');
        } else {
            html = self.fetch(
                self.host + '/vodshow/' + cat +
                '-----------' + (pg > 1 ? pg : '') + '/');
        }
        var list = self.parseList(html || '');
        if (!list.length && pg == 1) {
            d.push({
                title: '暂无数据（可能被风控，稍后再试）',
                col_type: 'text_center_1'
            });
        }
        for (var k = 0; k < list.length; k++) {
            d.push(list[k]);
        }

        setResult(d);
    },

    /* ===== 搜索 ===== */
    search: function() {
        var self = this;
        var d = this.d = [];
        var kw = getMyVar('keyword', '');
        if (!kw) { setResult(d); return; }
        var pg = typeof MY_PAGE !== 'undefined' ?
            parseInt(MY_PAGE, 10) : 1;
        if (isNaN(pg) || pg < 1) pg = 1;
        var url;
        if (pg == 1) {
            url = self.host + '/vodsearch/-------------.html?wd=' +
                encodeURIComponent(kw);
        } else {
            url = self.host + '/vodsearch/' +
                encodeURIComponent(kw) + '----------' + pg + '---/';
        }
        var html = self.fetch(url);
        var list = self.parseList(html || '');
        if (!list.length && pg == 1) {
            d.push({
                title: '没有找到"' + kw + '"相关影片',
                col_type: 'text_center_1'
            });
        }
        for (var i = 0; i < list.length; i++) {
            d.push(list[i]);
        }

        setResult(d);
    },

    /* ===== 详情页 ===== */
    detail: function() {
        var self = this;
        var d = this.d = [];
        var mp = typeof MY_PARAMS !== 'undefined' ?
            MY_PARAMS : {};
        var vid = mp.vod_id || getMyVar('vod_id', '');
        var name = mp.vod_name || getMyVar('vod_name', '');
        if (!vid) { setResult(d); return; }

        var res = self.fetch(self.host + '/voddetail/' + vid + '/');
        if (!res) {
            setError('详情页请求失败或被拦截');
            setResult(d);
            return;
        }

        var tTitle = name || '';
        var h1 = res.match(new RegExp(
            '<h1[^>]*>([\\s\\S]*?)</h1>'));
        if (h1) {
            tTitle = h1[1].replace(
                new RegExp('<[^>]+>', 'g'), '');
            tTitle = tTitle.replace(
                new RegExp('^\\s+|\\s+$', 'g'), '') || tTitle;
        }
        setPageTitle(tTitle);

        var cover = '';
        var cm = res.match(
            new RegExp('data-original="([^"]+)"'));
        if (!cm) cm = res.match(
            new RegExp('<img[^>]+src="([^"]+)"'));
        if (cm) cover = self.full(cm[1]);

        var intro = '';
        var im2 = res.match(new RegExp(
            '<p[^>]*class="[^"]*(?:content|detail|' +
            'intro|desc)[^"]*"[^>]*>([\\s\\S]*?)</p>', 'i'));
        if (im2) {
            intro = im2[1].replace(
                new RegExp('<[^>]+>', 'g'), '');
            intro = intro.replace(
                new RegExp('\\s+', 'g'), ' ').trim();
        }

        d.push({
            title: tTitle,
            img: cover,
            url: cover ? (cover + '#.jpg#') : 'hiker://empty',
            col_type: 'movie_1_vertical_pic_blur'
        });
        if (intro) {
            d.push({
                title: '<b><font color="#098AC1">' +
                    '剧情简介</font></b><br>' + intro,
                col_type: 'rich_text',
                extra: {
                    id: 'desc',
                    lineSpacing: 6,
                    textSize: 15,
                    lineVisible: true
                }
            });
        }

        /* ===== 选集：按线路(sid)分组 ===== */
        var lineNames = {};
        var groups = {};
        var order = [];
        var playRe = new RegExp(
            '<a\\s+([^>]*)href="([^"]*/play/(\\d+)-(\\d+)-' +
            '(\\d+)[^"]*)"[^>]*>([\\s\\S]*?)</a>', 'gi');
        var am;
        while ((am = playRe.exec(res)) !== null) {
            var avid = am[3];
            var sid = am[4];
            var nid = am[5];
            var atext = am[6].replace(
                new RegExp('<[^>]+>', 'g'), '');
            atext = atext.replace(
                new RegExp('\\s+', 'g'), ' ').trim();
            if (atext.indexOf('个视频') >= 0) {
                if (!lineNames[sid]) {
                    lineNames[sid] = atext.replace(
                        new RegExp('\\d+个视频', 'g'), '')
                        .trim() || ('线路' + sid);
                }
                continue;
            }
            if (!atext) continue;
            var epName = atext;
            var dm = epName.match(
                new RegExp('^第(\\d+)集$'));
            if (dm) {
                var en = parseInt(dm[1], 10);
                epName = en < 10 ? '0' + en : '' + en;
            } else {
                var nm = epName.match(
                    new RegExp('^(\\d+)$'));
                if (nm) {
                    var nn = parseInt(nm[1], 10);
                    epName = nn < 10 ? '0' + nn : '' + nn;
                }
            }
            if (!groups[sid]) {
                groups[sid] = [];
                order.push(sid);
            }
            groups[sid].push({
                name: epName,
                nid: nid,
                vid: avid
            });
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
                eps.push({
                    name: arr[ai].name,
                    sid: sk,
                    nid: arr[ai].nid,
                    vid: arr[ai].vid
                });
            }
            if (!eps.length) continue;
            var lname = lineNames[sk] || ('线路' + (oi + 1));
            allLines.push({ name: lname, eps: eps });
        }

        if (!allLines.length) {
            d.push({
                title: '未解析到剧集（可能被风控）',
                col_type: 'text_center_1'
            });
            setResult(d);
            return;
        }

        var curLine = parseInt(getMyVar('c71_line', '0'), 10);
        if (curLine < 0 || curLine >= allLines.length) {
            curLine = 0;
        }
        var sortType = getMyVar('c71_sort', 'asc');

        if (allLines.length > 1) {
            d.push({ col_type: 'line_blank' });
            for (var li = 0; li < allLines.length; li++) {
                (function(idx, nm) {
                    d.push({
                        title: curLine == idx ?
                            '「' + nm + '」' : nm,
                        url: $('#noLoading#').lazyRule(
                            function(i) {
                                putMyVar('c71_line',
                                    String(i));
                                refreshPage(false);
                                return 'hiker://empty';
                            }, idx),
                        col_type: 'scroll_button'
                    });
                })(li, allLines[li].name);
            }
        }

        d.push({
            title: sortType == 'asc' ? '正序' : '倒序',
            url: $('#noLoading#').lazyRule(function(s) {
                putMyVar('c71_sort',
                    s == 'asc' ? 'desc' : 'asc');
                refreshPage(false);
                return 'hiker://empty';
            }, sortType),
            col_type: 'flex_button'
        });
        d.push({ col_type: 'line_blank' });

        var eps2 = allLines[curLine].eps;
        if (sortType == 'desc') eps2 = eps2.slice().reverse();
        var ct = eps2.length > 20 ? 'text_4' : 'text_2';
        for (var ei = 0; ei < eps2.length; ei++) {
            (function(ep) {
                d.push({
                    title: ep.name,
                    url: self.playUrl(ep.sid, ep.nid, ep.vid),
                    col_type: ct
                });
            })(eps2[ei]);
        }

        setResult(d);
    },

    /* ===== 播放链接封装 ===== */
    playUrl: function(sid, nid, vid) {
        if (sid === undefined || nid === undefined ||
            vid === undefined) {
            return 'hiker://empty';
        }
        return $('').lazyRule(function(s, n, v) {
            return $.require('qy71v').play(s, n, v);
        }, sid, nid, vid);
    },

    /* ===== 播放地址解析 ===== */
    play: function(sid, nid, vid) {
        var self = this;
        var pu = self.host + '/play/' + vid + '-' +
            sid + '-' + nid + '/';
        var ph = request(pu, self.hdr());
        var real = '';
        var mm = ph.match(new RegExp(
            'var\\s+player_aaaa\\s*=\\s*' +
            '(\\{[\\s\\S]*?\\})\\s*;'));
        if (mm) {
            try {
                var obj = JSON.parse(mm[1]);
                var u = obj && obj.url;
                if (u) {
                    var enc = String(obj.encrypt || '0');
                    if (enc == '1') {
                        try { u = unescape(u); } catch (e) {}
                    } else if (enc == '2') {
                        try {
                            if (typeof atob == 'function') {
                                u = unescape(atob(u));
                            }
                        } catch (e) {}
                    }
                    real = u;
                }
            } catch (e) {}
        }
        if (!real) {
            var m2 = ph.match(new RegExp(
                'https?://\\S+\\.(?:m3u8|mp4|flv)' +
                '(?:\\?\\S*)?', 'i'));
            if (m2) real = m2[0];
        }
        if (!real) {
            setError('播放地址解析失败:' + pu);
            return 'hiker://empty';
        }
        return real;
    }
};

$.exports = qy71v;
