/**
 * AlipaySdkFactory
 * */
const AlipaySdk = require('./alipay');
const AlipayDb = require('./db');
const AlipayForm = require('./form');
const appId = require('../../../config/config')['pay_alipay_app_id'];
const configDoc = require('../../../config/config');
const fs = require('fs');
const path = require('path');
const privatePath = path.resolve(process.cwd(), 'server/cert/alipay/app_private_key.pem');
const publicPath = path.resolve(process.cwd(), 'server/cert/alipay/ali_public_key.pem');
const ecDo = require('../../ec-do/src/ec-do-2.0.0');
const privateTestPath = path.resolve(process.cwd(), '../../../cert/alipay/app_private_key.pem');
const publicTestPath = path.resolve(process.cwd(), '../../../cert/alipay/ali_public_key.pem');

class AlipayFactory {
    constructor(config = {}) {
        this._notifyUrl = configDoc['pay_alipay_notify_url'];
        this._returnUrl = configDoc['pay_alipay_return_url'];
        this._appId = configDoc['pay_alipay_app_id'];
        this.alipaySdkConfig = {
            appId: config.appid || this._appId,
            privateKey: config.privateKey || fs.readFileSync(privatePath, 'ascii'), // 项目启动
            alipayPublicKey: config.alipayPublicKey || fs.readFileSync(publicPath, 'ascii'),
            // privateKey: fs.readFileSync(privateTestPath, 'ascii'), // 测试启动
            // alipayPublicKey: fs.readFileSync(publicTestPath, 'ascii')
        };
        this.apiMapping = {
            pay: 'alipay.trade.page.pay',
            refund: 'alipay.trade.refund',
            close: 'alipay.trade.close',
            query: 'alipay.trade.query',
            refundQuery: 'alipay.trade.fastpay.refund.query',
            billQuery: 'alipay.data.dataservice.bill.downloadurl.query'
        };
        this.method = config.method || 'pay' // api名称
    }

    get ALIPAY_API_MAPPING() {
        return this.apiMapping[this.method]
    }

    get notifyUrl() {
        return this._notifyUrl
    }

    get returnUrl() {
        return this._returnUrl
    }

    setMethod(method) {
        this.method = method
    }

    /***
     * 功能: 返回alipaySdk实例
     * @returns {AlipaySdk}
     */
    createAlipaySdk() {
        // console.log('[this.alipaySdkConfig]', this.alipaySdkConfig)
        return new AlipaySdk(this.alipaySdkConfig)
    }

    /***
     * 功能: 返回alipayForm实例
     * @returns {AlipayForm}
     */
    static createAlipayForm() {
        return new AlipayForm()
    }

    /***
     * 功能: 返回alipayDb实例
     * @returns {AlipayDb}
     */
    createAlipayDb() {
        return new AlipayDb(this.alipaySdkConfig)
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

module.exports = AlipayFactory;