/**
 * 支付统一接口
 * */

// 微信支付
const TWeixinPayAPI = require('./lib/twx');
const fs = require('fs');
const path = require('path');
const {
    pay_wx_appid,
    pay_wx_mch_id,
    pay_wx_key,
    pay_wx_sign_type,
    pay_wx_notify_url,
    pay_wx_spbill_create_ip
} = require('../../config/config');

// process.cwd() >>> 当前的工作路径
// certPath 微信支付证书
const certPath = path.resolve(process.cwd(), 'server', 'cert', 'wx', 'apiclient_cert.p12');

const twxpay = new TWeixinPayAPI({
    appid: pay_wx_appid,
    mch_id: pay_wx_mch_id,
    key: pay_wx_key,
    notify_url: pay_wx_notify_url, // 回调地址
    sign_type: pay_wx_sign_type,
    spbill_create_ip: pay_wx_spbill_create_ip, // 本机IP
    trade_type: 'NATIVE',
    // pfx: fs.readFileSync(certPath),
    pfxPath: certPath
});

// 支付宝支付
const TAlipayAPI = require('./lib/talipay');
const {
    pay_alipay_app_id, // 正式app_id
    pay_alipay_app_id_sandBox, // 沙箱app_id
    pay_alipay_charset,
    pay_alipay_sign_type,
    pay_alipay_version,
    pay_alipay_notify_url, // 支付宝回调url
    pay_alipay_timeout_express // 该笔订单允许的最晚付款时间
} = require('../../config/config');

// 私钥(process.cwd()从npm run start开始计算路径)
const privateKeyPath = path.resolve(process.cwd(), 'server', 'cert', 'alipay', 'app_private_key.pem');
const publicKeyPath = path.resolve(process.cwd(), 'server', 'cert', 'alipay', 'ali_public_key.pem');

const talipay = new TAlipayAPI({
    // app_id: pay_alipay_app_id_sandBox,
    app_id: pay_alipay_app_id,
    app_id_sandBox: pay_alipay_app_id_sandBox,
    charset: pay_alipay_charset,
    sign_type: pay_alipay_sign_type,
    version: pay_alipay_version,
    notify_url: pay_alipay_notify_url,
    timeout_express: pay_alipay_timeout_express,
    sandBox: false,
    privateKeyPath,
    publicKeyPath
});

module.exports = {
    twxpay,
    talipay
};