var map;
// // 鳥取駅
const m00 = [35.493795, 134.225827];
//---------------------------------------------
// (0.1)アイコン群の設定
// L.maker(pos,{add})のaddに{icon:i_hn}など
const i_hn = L.icon({
    iconUrl: 'icons/hn.png',
    iconRetinaUrl: 'icons/hnb.png',
    iconSize: [50, 50],
    iconAnchor: [25, 50],
    popupAnchor: [0, -50],
});
const i_nh = L.icon({
    iconUrl: 'icons/nh.png',
    iconRetinaUrl: 'icons/nhb.png',
    iconSize: [50, 50],
    iconAnchor: [25, 50],
    popupAnchor: [0, -50],
});
const pickIcon = L.divIcon({
    className: 'icon1',
    iconAnchor: [13, 13]
});
const loadjson = (addURL) => {
    const baseURL = "./";
    // var data;
    return fetch(baseURL + addURL)
        .then(response => {
            if (response.ok) {
                // httpレスポンスからjsonを抽出
                return response.json();
            } else {
                Promise.reject(new Error("error"))
            }
        })
        .catch(e => {
            console.log(e.message);
        });
}
//---------------------------------------------

// TODO : 後々リファクタリングしたい……

/**
 * @method init ロード時に実行する処理
 */
const init = async () => {
    const promiseloadJsons = [
        loadjson("stopinfo/data_11.json"),
        loadjson("stopinfo/data_12.json"),
        loadjson("stopinfo/data_21.json"),
        loadjson("stopinfo/data_22.json")
    ];

    let data11, data12, data21, data22, clipnotes;
    await Promise.all(promiseloadJsons)
        .catch(e => {
            console.log(e);
        })
        .then(r => {
            data11 = r[0];
            data12 = r[1];
            data21 = r[2];
            data22 = r[3];
            clipnotes = r[4];
        });
    map = L.map('map01', {
        zoomControl: false,
        minZoom: 11,
        maxZoom: 17,
    });
    map.setView(m00, 14);
    const pngUrl = 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png';
    const attribution = "<a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル(淡色)</a>";
    const base = L.tileLayer(pngUrl, {
        attribution
    }).addTo(map);
    //---------------------------------------------
    // ローカルバス群
    // (1.1.1)lbm線情報
    const lbm_lines = L.tileLayer('xyz/lbmli/{z}/{x}/{y}.png', {
        tileSize: 256,
        minNativeZoom: 13,
        minZoom: 12,
        maxNativeZoom: 15,
        maxZoom: 17,
        opacity: 0.8,
        errorTileUrl: "icons/noimage.png",
        attribution: "<a href='https://busroutemap.github.io/tottori/index.html' target='_blank'>busroutemap (CC BY 4.0)</a>"
    }).addTo(map);
    //---------------------------------------------
    //(2)バス停位置群
    // lbm_m_in : 上りバス停群
    // lbm_m_out : 下りバス停群
    // (2.1)日ノ丸上り
    // 将来、外国語対応やバス停情報に路線情報をリンクさせる等の場合、
    // conを変えてpass["意訳英語名称"]や<a>路線情報</a>などを検討？
    // vuejsでja/enの瞬殺切り替えとかできれば良いのだけども
    const makeStops = (stops, style) => {
        const markers = stops.map(stop => {
            const position = [
                stop["緯度"],
                stop["経度"]
            ];
            const pop = L.popup().setContent(
                stop["上下循環区分"] + '<hr><h2>' + stop["バス停名"] + '</h2>'
            );
            return L.marker(position, {
                    icon: style
                }).bindPopup(pop);
        });
        return markers;
    }
    // 11 日ノ丸上り
    // 12 日ノ丸下り
    // 21 日交上り
    // 22 日交下り
    const l11 = makeStops(data11, i_hn);
    const l12 = makeStops(data12, i_hn);
    const l21 = makeStops(data21, i_nh);
    const l22 = makeStops(data22, i_nh);
    const instops = l11.concat(l21);
    const outstops = l12.concat(l22)
    const lbm_m_in = L.layerGroup(instops);
    const lbm_m_out = L.layerGroup(outstops);

    // (11)注記レイヤー
    const clips = L.geoJSON(clipnotes, {
            attribution: "<a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院地図</a>にて座標を収集"
        })
        .bindPopup((layer) => {
            const name = layer.feature.properties.name;
            const desc = layer.feature.properties.description;
            const content = `<h3>${name}</h3>${desc}`;
            return content;
        }).addTo(map);
    //---------------------------------------------
    // (add01)レイヤー表示切替
    const overlays = {
        "<b>(路線バス)</b> 停留所 <上り><br>bus stops < inbound ><hr>": lbm_m_in,
        "<b>(路線バス)</b> 停留所 <下り><br>bus stops < outbound ><hr>": lbm_m_out,
        "<b>(バス・鉄道)</b> 経路・情報<br>routes<hr>": lbm_lines,
    }
    //---------------------------------------------
    //layersコントロールのオーバーレイに設定
    L.control.layers(null, overlays).addTo(map);
    // (add02)ズームボタン
    L.control.zoom({
        position: 'topright'
    }).addTo(map);
    //---------------------------------------------
    // (add03)EasyButton
    L.easyButton('fa fa-info-circle', function (btn, easyMap) {
        window.open("help/");
    }, '説明書を表示', {
        position: 'topright'
    }).addTo(map);
    //---------------------------------------------
    // (add04)LocateControlプラグイン
    L.control.locate({
        position: 'topright',
        strings: {
            title: "現在地を表示",
            popup: "いまここ"
        },
        locateOptions: {
            maxZoom: 16
        }
    }).addTo(map);
    //---------------------------------------------
    // (add05)表示位置を初期値に戻すボタン
    L.easyButton('fa fa-home', function (btn, easyMap) {
        map.setView(m00, 14);
    }, '表示を初期状態に戻す', {
        position: 'topright'
    }).addTo(map);
    //---------------------------------------------
    // (add99)hashプラグイン
    new L.Hash(map);
    //---------------------------------------------
}
