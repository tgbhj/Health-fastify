/***
 * 签名
 * @param method
 * @param params
 * @param config
 */

const TBase = require("../lib/tbase");
const MD5 = require('blueimp-md5');
const iconv = require('iconv-lite');
const snakeCaseKeys = require('snakecase-keys');
const {wxpay_key} = require('../../../config/config');

function sign(params = {}, config) {
    let signParams = Object.assign({ // 这里参数表示: 微信各个接口用到的共同的参数
        appid: config.appId,
        mchId: config.mchId,
        // spbillCreateIp: config.spbillCreateIp,
        // tradeType: config.tradeType,
        nonceStr: TBase.generateRandomStrings(32),
        // notifyUrl: config.notifyUrl
    }, params);
    // 驼峰转成下划线
    let decamelizeParams = snakeCaseKeys(signParams);
    // delete decamelizeParams['app_id']
    // decamelizeParams['appid'] = config.appId // 特殊写法字段
    // 排序
    let signStr = Object.keys(decamelizeParams).sort().map((key) => {
        let data = decamelizeParams[key];
        if (Object.prototype.toString.call(data) !== '[object String]') { // 查看data的具体数据类型
            data = JSON.stringify(data)
        }
        return `${key}=${iconv.encode(data, config.charset)}` // value转成utf-8格式
    }).join('&'); // 拼接
    // 拼接密钥key
    signStr += `&key=${config.key}`;
    console.log('[signStr]', signStr);
    // 计算签名
    const sign = MD5(signStr).toUpperCase();
    console.log('[sign]', sign);
    return Object.assign(decamelizeParams, {sign})
}

exports.sign = sign;

function checkSign(params, config) {
    delete params['sign'];
    let paramsStr = Object.keys(params).sort().map((key) => {
        let data = params[key];
        if (data === 'undefined' || data === '' || data === null) {
            delete params[key];
            return
        }
        if (Object.prototype.toString.call(data) === '[object String]') {
            data = JSON.stringify(data)
        }
        return `${key}=${iconv.encode(data, config.charset)}`
    }).join('&');
    paramsStr += `&key=${config.key}`;
    paramsStr = paramsStr.replace(/&&/g, '&'); // 删除值为空的字段会产生'&&', 使用正则将'&&'改为'&'
    paramsStr = paramsStr.replace(/"/g, ''); // 字符串删除'"'双引号
    console.log('[paramsStr]', paramsStr);
    const sign = MD5(paramsStr).toUpperCase();
    console.log('[sign]', sign);
    return sign
}

exports.checkSign = checkSign;

function appSign(params = {}) {
    let signParams = Object.assign(params); // 这里参数表示: 微信各个接口用到的共同的参数
    // 驼峰转成下划线
    let decamelizeParams = snakeCaseKeys(signParams);
    // 排序
    let signStr = Object.keys(decamelizeParams).sort().map((key) => {
        let data = decamelizeParams[key];
        if (Object.prototype.toString.call(data) !== '[object String]') { // 查看data的具体数据类型
            data = JSON.stringify(data)
        }
        return `${key}=${iconv.encode(data, 'utf-8')}` // value转成utf-8格式
    }).join('&'); // 拼接
    // 拼接密钥key
    signStr += `&key=${wxpay_key}`;
    console.log('[signStr]', signStr);
    // 计算签名
    const sign = MD5(signStr).toUpperCase();
    console.log('[sign]', sign);
    return Object.assign(decamelizeParams, {sign})
}

exports.appSign = appSign;

/***
 *  随机字符串(32,字母+数字)
 */
function generateRandomStrings(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const maxPos = chars.length;
    let nonceStr = '';
    for (let i = 0; i < (length || 32); i++) {
        nonceStr += chars.charAt(Math.floor(Math.random() * maxPos))
    }
    return nonceStr
}

exports.generateRandomStrings = generateRandomStrings;