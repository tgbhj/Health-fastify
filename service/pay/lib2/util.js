const crypto = require('crypto');
const moment = require('moment');
const iconv = require('iconv-lite');
const snakeCaseKeys = require('snakecase-keys');
const ALIPAY_ALGORITHM_MAPPING = {RSA: 'RSA-SHA1', RSA2: 'RSA-SHA256'};
exports.ALIPAY_ALGORITHM_MAPPING = ALIPAY_ALGORITHM_MAPPING;

/**
 * 签名
 * @param method 调用接口方法名, 比如: alipay.trade.page.pay
 * @param params 公共请求参数和请求参数(biz_content)
 * @param params bizContent或return_url或return_url或其他
 * @param config sdk配置(appid, privateKey, alipayPublicKey)
 */
function sign(method, params = {}, config) {
    let bizContent = params.bizContent || null;
    delete params.bizContent;
    const signParams = Object.assign({
        method,
        appId: config.appId,
        charset: config.charset,
        signType: config.signType,
        version: config.version,
        timestamp: moment().format('YYYY-MM-DD HH:mm:ss')
    }, params);
    // 将bizContent中的内容 1.转成下划线 2.转成字符串
    if (bizContent) {
        signParams.bizContent = JSON.stringify(snakeCaseKeys(bizContent))
    }
    // 驼峰转成下划线
    let decamelizeParams = snakeCaseKeys(signParams);
    // 排序
    const signStr = Object.keys(decamelizeParams).sort().map((key) => {
        let data = decamelizeParams[key];
        if (Object.prototype.toString.call(data) !== '[object String]') { // 比较类型, 比起[object]更进一步
            data = JSON.stringify(data)
        }
        return `${key}=${iconv.encode(data, config.charset)}` // value转成utf-8格式
    }).join('&'); // 拼接
    // console.log('[util 等待验签的字符串]', signStr)
    // 计算签名
    const sign = crypto.createSign(ALIPAY_ALGORITHM_MAPPING[config.signType])
        .update(signStr, 'utf8')
        .sign(config.privateKey, 'base64');

    return Object.assign(decamelizeParams, {sign})
}

exports.sign = sign;