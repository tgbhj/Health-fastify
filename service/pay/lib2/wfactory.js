/**
 * WxpaySdkFactory
 * */
const WxpaySdk = require('../lib/twx');
const WxpayDb = require('./wdb');
const WxpaySdk2 = require('./wxpay');
const WxpayForm = require('./wform');
const path = require('path');
const configDoc = require('../../../config/config');
const certPath = path.resolve(process.cwd(), 'server/cert/wx/apiclient_cert.p12'); // 正式
// const certPath = path.resolve(process.cwd(), '../../../../cert/wx/apiclient_cert.p12') // 测试
const ecDo = require('../../ec-do/src/ec-do-2.0.0');

class WxpaySdkFactory {
    constructor(config = {}) {
        this.wxpaySdkConfig = {
            // 配置参数
            appId: configDoc['wxpay_appid'],
            mchId: configDoc['wxpay_mch_id'],
            key: configDoc['wxpay_key'],
            notifyUrl: configDoc['pay_wx_notify_url'],
            signType: configDoc['pay_wx_sign_type'],
            spbillCreateIp: configDoc['pay_wx_spbill_create_ip'],
            tradeType: 'NATIVE',
            certPath
        };
        this.wxpayPhoneConfig = {
            // 配置参数
            appId: configDoc['wxpay_appid'],
            mchId: configDoc['wxpay_mch_id'],
            key: configDoc['wxpay_key'],
            notifyUrl: configDoc['pay_wx_notify_url'],
            signType: configDoc['pay_wx_sign_type'],
            spbillCreateIp: configDoc['pay_wx_spbill_create_ip'],
            tradeType: 'APP',
            certPath
        };
        this.apiMapping = {
            'unifiedorder': 'https://api.mch.weixin.qq.com/pay/unifiedorder',
            'orderquery': 'https://api.mch.weixin.qq.com/pay/orderquery',
            'closeorder': 'https://api.mch.weixin.qq.com/pay/closeorder',
            'refund': 'https://api.mch.weixin.qq.com/secapi/pay/refund',
            'downloadbill': 'https://api.mch.weixin.qq.com/pay/downloadbill',
            'downloadfundflow': 'https://api.mch.weixin.qq.com/pay/downloadfundflow',
            'refundquery': 'https://api.mch.weixin.qq.com/pay/refundquery',
        };
        this.method = config.method || 'unifiedorder'
    }

    get WXPAY_API_MAPPING() {
        return this.apiMapping[this.method]
    }

    setMethod(method) {
        this.method = method
    }

    createWxpaySdk() {
        return new WxpaySdk(this.wxpaySdkConfig)
    }

    createWxpaySdk3() {
        return new WxpaySdk2(this.wxpayPhoneConfig)
    }

    createWxpaySdk2() {
        return new WxpaySdk2(this.wxpaySdkConfig)
    }

    createWxpayDb() {
        return new WxpayDb(this.wxpaySdkConfig)
    }

    /***
     * 返回wxpayForm实例(证书请求用)
     * @returns {WxpayForm}
     */
    static createWxpayForm() {
        return new WxpayForm()
    }

    /***
     * 功能: 商户订单号(32,当前时间+6位随机数)
     * @returns {String}outTradeNo 驼峰写法, 在签名前, 统一转换成下划线
     */
    static generateOutTradeNo() {
        const date = new Date();
        let fullYear = date.getFullYear();
        let nowMonth = date.getMonth() + 1;
        let strDate = date.getDate();

        // 月份处理
        if (nowMonth >= 1 && nowMonth <= 9) {
            nowMonth = '0' + nowMonth
        }

        // 日期处理
        if (strDate >= 1 && strDate <= 9) {
            strDate = '0' + strDate
        }

        const today = fullYear + nowMonth + strDate;
        // 6位随机数
        return today + ecDo.randomNumber(100000, 999999)
    }

    /***
     * 功能: 判断值是否为undefined/null/空字符串
     * 源码: 使用的是Object.prototype.toString.call(测试体) === [Object Undefined/Null/String]
     * @param {String} val 检查的值
     * @returns {boolean} true: 表示非undefined; false:表示undefined
     */
    static isType(val) {
        // console.log('[isUndefined]', ecDo.istype(val, 'undefined'))
        // console.log('[isNull]', ecDo.istype(val, 'null'))
        // console.log('[isLength]', val.length === 0)
        return !(ecDo.istype(val, 'undefined') || ecDo.istype(val, 'null') || val.length === 0);
    }
}

module.exports = WxpaySdkFactory;