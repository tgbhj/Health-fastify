/**
 * pay/lib2/test >>> 支付宝测试
 * pay/lib2/test/wxpayTest >>> 微信支付测试
 * */

const WxpaySdkFactory = require("../wfactory");
const WxFactory = require('../wfactory');
const wxFactory = new WxFactory();
const configDoc = require('../../../../config/config');
const camelCaseKeys = require('camelcase-keys');
const snakeCaseKeys = require('snakecase-keys');

async function unifiedorderWx() {
    try {
        let result = await wxFactory.createWxpaySdk2().exec(
            wxFactory.WXPAY_API_MAPPING, // 接口链接
            {
                body: '商品描述',
                outTradeNo: WxpaySdkFactory.generateOutTradeNo(),
                totalFee: 1, // 表示0.01
                spbillCreateIp: configDoc.pay_wx_spbill_create_ip,
                tradeType: 'NATIVE',
                notifyUrl: configDoc.pay_wx_refund_notify_url
            },
            {
                validateSign: true
            }
        );

        console.log('[unifiedorderWx result]', result)
    } catch (err) {
        console.log('[unifiedorderWx err]', err)
    }
}

// unifiedorderWx()

async function orderquery() {
    try {
        wxFactory.setMethod('orderquery');
        console.log('[method]', wxFactory.method);
        let result = await wxFactory.createWxpaySdk2().exec(
            wxFactory.WXPAY_API_MAPPING, // 接口链接
            {
                outTradeNo: '20180818714435',
            },
            {
                validateSign: true
            }
        );

        console.log('[orderquery result]', result)
    } catch (err) {
        console.log('[orderquery err]', err)
    }
}

// orderquery()

async function closeorder() {
    try {
        wxFactory.setMethod('closeorder');
        let result = await wxFactory.createWxpaySdk2().exec(
            wxFactory.WXPAY_API_MAPPING,
            {
                outTradeNo: '20180818714435'
            },
            {
                validateSign: true
            }
        );

        console.log('[closeorder result]', result)
    } catch (err) {
        console.log('[closeorder err]', err)
    }
}

// closeorder()

async function refund() {
    try {
        let formData = WxpaySdkFactory.createWxpayForm()
            .addField('outTradeNo', '20180820732835')
            .addField('outRefundNo', '20180820732835')
            .addField('totalFee', 1)
            .addField('refundFee', 1);

        wxFactory.setMethod('refund');
        let result = await wxFactory.createWxpaySdk2().exec(
            wxFactory.WXPAY_API_MAPPING,
            {},
            {
                formData,
                validateSign: true
            }
        );

        console.log('[refund result]', result)
    } catch (err) {
        console.log('[refund err]', err)
    }
}

/**
 * 1.在调用的时， 就报错；没有得到then任何的反馈响应.
 * 2.成功:
 *  pfx: fs.readFileSync(certPath, 'utf8')
 *  改为
 *  pfx: fs.readFileSync(certPath)
 * */
// refund()

async function refundquery() {
    try {
        wxFactory.setMethod('refundquery');
        let result = await wxFactory.createWxpaySdk2().exec(
            wxFactory.WXPAY_API_MAPPING,
            {
                outTradeNo: '20180818714435'
            },
            {
                validateSign: true
            }
        );

        console.log('[refundquery result]', result)
    } catch (err) {
        console.log('[refundquery err]', err)
    }
}

// refundquery()

// 下载对账单
async function downloadbill() {
    try {
        wxFactory.setMethod('downloadbill');
        let result = await wxFactory.createWxpaySdk2().exec(
            wxFactory.WXPAY_API_MAPPING,
            {
                billDate: '20180816',
                billType: 'ALL'
            },
            {
                validateSign: false
            }
        );

        console.log('[downloadbill result]', result)
    } catch (err) {
        console.log('[downloadbill err]', err)
    }
}

// downloadbill()

async function downloadfundflow() {
    try {
        let formData = WxpaySdkFactory.createWxpayForm()
            .addField('billDate', '20180701')
            .addField('accountType', 'Basic')
            .addField('signType', '');

        wxFactory.setMethod('downloadfundflow');
        let result = await wxFactory.createWxpaySdk2().exec(
            wxFactory.WXPAY_API_MAPPING,
            {},
            {
                formData,
                validateSign: true
            }
        );

        console.log('[downloadfundflow result]', result)
    } catch (err) {
        console.log('[downloadfundflow err]', err)
    }
}

// downloadfundflow()

/**
 * 1.写一个和form.js相同的wform.js --- 完成
 * 2.测试退款
 * 3.查询退款
 * 4.下载对账单
 * 5.下载资金账单(HMAC-SHA256签名，暂时不写了)
 * ----以上都完成了----
 * 6.编写对应路由 --- 完成
 * 7.设置wdb, 用于微信支付的数据库操作 --- 完成
 * */

function isParse() {
    let str =
        '<xml><return_code><![CDATA[SUCCESS]]></return_code>\n' +
        '<return_msg><![CDATA[OK]]></return_msg>\n' +
        '<appid><![CDATA[wx315ac5d37a858129]]></appid>\n' +
        '<mch_id><![CDATA[1274134501]]></mch_id>\n' +
        '<nonce_str><![CDATA[NIIs3nXBXrel1AfK]]></nonce_str>\n' +
        '<sign><![CDATA[8752411902C60D502971DBE1AA4E574B]]></sign>\n' +
        '<result_code><![CDATA[SUCCESS]]></result_code>\n' +
        '<out_trade_no><![CDATA[20180818714435]]></out_trade_no>\n' +
        '<attach><![CDATA[]]></attach>\n' +
        '<trade_state><![CDATA[CLOSED]]></trade_state>\n' +
        '<trade_state_desc><![CDATA[订单已关闭]]></trade_state_desc>\n' +
        '</xml>';
    console.log(str.startsWith('<xml>'))
}

// isParse()

/**
 * 1.支付宝: 异步通知, 返回参数, 更新新字段属性到数据库 --- 完成
 *  1.2退款， 数据库没有保存更新 --- 完成
 * 2.微信支付: 完成剩余路由， 注意退款信息的保存 && 可更新mongo的wxpay schema --- 完成
 * 3.统一支付宝传入参数都以驼峰形式 --- 完成
 * 4.wx数据库的payStatus在支付成功后， 未更新， 仔细检查. --- 完成
 * 5.query.js中微信支付取消订单, 需要修改 --- 完成
 * 6.支付宝模仿微信支付, 增加退款信息, 自己添加退款状态, 和支付状态区分开来 --- 完成
 * 7.在有需要数据库操作之前, 都需要判断返回信息状态tradeStatus --- 完成
 * 8.支付宝统一返回格式 ---
 * */

/**
 * 测试camelcase-keys
 * */
function testCamelCaseKeys() {
    let postData = {
        returnCode: 'SUCCESS',
        returnMsg: 'OK',
        appid: 'wx315ac5d37a858129',
        mchId: '1274134501',
        nonceStr: 'Z35PosGqtSNgbOyl',
        sign: '1C748D84AEC349F2056028E54559E572',
        resultCode: 'SUCCESS',
        transactionId: '4200000166201808214144969496',
        outTradeNo: '20180821468859',
        outRefundNo: '20180821468859',
        refundId: '50000007892018082106048872060',
        refundChannel: '',
        refundFee: '1',
        couponRefundFee: '0',
        totalFee: '1',
        cashFee: '1',
        couponRefundCount: '0',
        cashRefundFee: '1'
    };

    let res = snakeCaseKeys(postData);
    console.log('[res]', res)
}

// testCamelCaseKeys()