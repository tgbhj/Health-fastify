/**
 * 支付共享方法
 * */

const ecDo = require('../../../service/ec-do/src/ec-do-2.0.0');
const rp = require('request-promise');
const moment = require('moment');

/*
*   1.在constructor中传入参数
*   2.通过私有方法，生成必要参数或签名，等其他
*   3.转成<xml>格式，并返回
* */
class TBase {
    constructor() {
        // ...
        if (new.target === TBase) {
            throw new Error('本类不能实例化')
        }
    }

    // 随机字符串(32,字母+数字)
    static generateRandomStrings(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const maxPos = chars.length;
        let nonce_str = '';

        for (let i = 0; i < (length || 32); i++) {
            nonce_str += chars.charAt(Math.floor(Math.random() * maxPos))
        }

        return nonce_str
    }

    // 商户订单号(32,当前时间+6位随机数)
    static generateOutTradeNo() {
        let out_trade_no;
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
        out_trade_no = today + ecDo.randomNumber(100000, 999999); // 6位随机数

        return out_trade_no
    }

    static generateOutRefundNo() {
        return TBase.generateOutTradeNo()
    }

    // 排序
    async sortParams() {
        const keys = Object.keys(this.params).sort();
        const result = {};
        keys.forEach((key) => {
            Object.assign(result, {[key]: this.params[key]})
        });
        this.params = result
    }

    // 去空
    async filterParams() {
        delete this.params['sign'];
        // delete this.params['sign_type']
        Object.keys(this.params).forEach((key) => {
            if (this.params[key] === '' || this.params[key] === undefined || this.params[key] === null) {
                delete this.params[key]
            }
        })
    }

    // 拼接(key) & 微信支付需要拼接key & 支付宝不需要拼接key
    async linkParams() {
        const {key} = this.config;
        this.linkStr = ecDo.setUrlPrmt(Object.assign(this.params, {key}))
    }

    // 签名
    sign({buildParams}) {
        // ...
    }

    static generateTimeStamp() {
        return moment().format('YYYY-MM-DD HH:mm:ss')
    }

    // 请求
    static async _request({options}) {
        // console.log('[_request]', this.reqXml)
        return rp(options)
    }
}

module.exports = TBase;