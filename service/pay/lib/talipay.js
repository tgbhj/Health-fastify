/**
 * 支付宝
 * */
const TBase = require('./tbase');
const _ = require('underscore');
const crypto = require('crypto');
const signTool = crypto.createSign('RSA-SHA256');
const ecDo = require('../../../service/ec-do/src/ec-do-2.0.0');
const qs = require('querystring');
const Alipay = require('../../../dbs/alipay');
const fs = require('fs');

class TAlipayAPI extends TBase {
    constructor(options) {
        super();
        let config = {
            host: !options.sandBox
                ? 'https://openapi.alipay.com/gateway.do?' // 正式url
                : 'https://openapi.alipaydev.com/gateway.do?', // 沙箱url

            app_id: !options.sandBox
                ? options.app_id // 正式app_id
                : options.app_id_sandBox, // 沙箱app_id

            precreate: 'alipay.trade.precreate',
            query: 'alipay.trade.query',
            refund: 'alipay.trade.refund',
            cancel: 'alipay.trade.cancel',
        };
        config = Object.assign({}, options, config);
        this.paytype = 'talipay';
        this.config = config;
        this.linkStr = ''; // 拼接完成的字符串
        this.qsBody = ''; // 已经转义的字符串
        this.params = {} // 参数准备，开始处理
    }

    // 支付宝请求网关
    getAlipayGateway() {
        return this.config.host
    }

    set totalAmountValid(value) {
        if (value <= 0) {
            throw new Error('金额必须 > 0')
        } else {
            this.total_amount = value
        }
    }

    set subjectValid(str) {
        const regexp = /^Seeitv充值中心-/;
        if (regexp.test(str)) {
            this.subject = str
        } else {
            this.subject = 'Seeitv充值中心-' + str
        }
    }

    set methodValid(method) {
        const regexp = /^alipay.trade./;
        if (regexp.test(method)) {
            this.method = method
        } else {
            throw new Error('接口名称无效')
        }
    }

    /*
    * 统一收单线下交易预创建(扫码支付)
    * 1.拼装参数
    * 2.选取参数中需要的属性属性
    * 3.处理biz_content:{...}对象中的内容 & JSON.stringify(...)
    * 4.排序&去空&拼接(签名的拼接)
    * 5.签名
    * 6.将签名添加到请求对象中
    * 7.拼接字符串+转义(qs.stringify(...))
    * 8.发起请求
    * 9.解析结果，并返回
    * */
    async precreate() {
        const selectArray = ['app_id', 'method', 'charset', 'sign_type', 'timestamp', 'version', 'biz_content'];
        const selectChildArray = ['out_trade_no', 'total_amount', 'subject', 'timeout_express'];
        // 1.
        await this._buildParams({method: this.config.precreate});
        await this._saveInDB();
        // 2.
        await this._handleParamsSelect(selectArray);
        await this._handleParamsChildSelect(selectChildArray);
        // 3.
        await this._handleChildObj();
        // 4.
        await this._handleParamsBefore();
        // 5.
        const _sign = await this._sign();
        // 6.
        await this._handleParamsAfter(_sign);
        // 7.
        await this._buildQsBody();
        // 8.
        const options = {
            method: 'POST',
            uri: this.getAlipayGateway() + this.qsBody,
            json: true // true >>> object & false >>> string
        };
        return await TBase._request({options})
    }

    /**
     * 查询订单
     * @param out_trade_no
     * @param trade_no
     * @returns {Promise<void>}
     */
    async createQueryOrder({out_trade_no, trade_no}) {
        const selectArray = ['app_id', 'method', 'charset', 'sign_type', 'timestamp', 'version', 'biz_content'];
        const selectChildArray = [];
        out_trade_no && selectChildArray.push('out_trade_no');
        trade_no && selectChildArray.push('trade_no');

        // 1.
        await this._buildParams({
            method: this.config.query,
            out_trade_no,
            trade_no,
        });
        // 2.
        await this._handleParamsSelect(selectArray);
        await this._handleParamsChildSelect(selectChildArray);
        // 3.
        await this._handleChildObj();
        // 4.
        await this._handleParamsBefore();
        // 5.
        const _sign = await this._sign();
        // 6.
        await this._handleParamsAfter(_sign);
        // 7.
        await this._buildQsBody();
        // 8.
        const options = {
            method: 'POST',
            uri: this.getAlipayGateway() + this.qsBody,
            json: true // true >>> object & false >>> string
        };
        return await TBase._request({options})
    }

    /**
     * 撤销订单
     * @param out_trade_no
     * @param trade_no
     * @returns {Promise<*>}
     */
    async createCancelOrder({out_trade_no, trade_no}) {
        const selectArray = ['app_id', 'method', 'charset', 'sign_type', 'timestamp', 'version', 'biz_content'];
        const selectChildArray = [];
        out_trade_no && selectChildArray.push('out_trade_no');
        trade_no && selectChildArray.push('trade_no');

        // 1.
        await this._buildParams({
            method: this.config.cancel,
            out_trade_no,
            trade_no,
        });
        // 2.
        await this._handleParamsSelect(selectArray);
        await this._handleParamsChildSelect(selectChildArray);
        // 3.
        await this._handleChildObj();
        // 4.
        await this._handleParamsBefore();
        // 5.
        const _sign = await this._sign();
        // 6.
        await this._handleParamsAfter(_sign);
        // 7.
        await this._buildQsBody();
        // 8.
        const options = {
            method: 'POST',
            uri: this.getAlipayGateway() + this.qsBody,
            json: true // true >>> object & false >>> string
        };
        return await TBase._request({options})
    }

    /**
     * 退款
     * @param out_trade_no
     * @param trade_no
     * @param refund_amount
     * @returns {Promise<*>}
     */
    async createRefund({out_trade_no, trade_no, refund_amount}) {
        const selectArray = ['app_id', 'method', 'charset', 'sign_type', 'timestamp', 'version', 'biz_content'];
        const selectChildArray = ['refund_amount'];
        out_trade_no && selectChildArray.push('out_trade_no');
        trade_no && selectChildArray.push('trade_no');
        // 1.
        await this._buildParams({
            method: this.config.refund,
            out_trade_no,
            trade_no,
            refund_amount
        });
        // 2.
        await this._handleParamsSelect(selectArray);
        await this._handleParamsChildSelect(selectChildArray);
        // 3.
        await this._handleChildObj();
        // 4.
        await this._handleParamsBefore();
        // 5.
        const _sign = await this._sign();
        // 6.
        await this._handleParamsAfter(_sign);
        // 7.
        await this._buildQsBody();
        // 8.
        const options = {
            method: 'POST',
            uri: this.getAlipayGateway() + this.qsBody,
            json: true // true >>> object & false >>> string
        };
        return await TBase._request({options})
    }

    // 验证签名 同步
    async signVerifySync(body, method) {
        console.log('[async signVerifySync %%%%%%%%%%%%%%]', body);
        return this._signVerifySync(body, method)
    }

    // 验证签名 异步 ??? 测试
    async signVerifyAsync(body) {
        return this._signVerifyAsync(body)
    }

    /**
     * 验证参数的有效性 ??? 测试
     * @param body
     * @returns {Promise<boolean>}
     */
    static async checkVerify({appid, out_trade_no, total_amount}) {
        let payOrder = await Alipay.findOne({out_trade_no});
        return appid === payOrder['appid'] && total_amount === payOrder['total_amount'];
    }

    /**
     * 更新订单状态 & 同时可以保存其他参数 ??? 测试
     * payStatus = 1 支付成功
     * payStatus = 2 支付失败
     * @param out_trade_no
     * @param payStatus
     * @returns {Promise<boolean>}
     */
    static async updateOrderState({out_trade_no, payStatus}) {
        const order = await Alipay.findOne({out_trade_no});
        if (order['payStatus'] === 0) {
            return await Alipay.update({out_trade_no}, {$set: {payStatus}});
        } else {
            // 订单的交易状态已经改变
            // 0(未支付) >>> 1(支付成功)
            // 0(未支付) >>> 2(支付失败)
            return false
        }
    }

    // 测试方法，可删
    async getKey() {
        return this.config.key
    }

    // 测试方法(沙箱和正式环境切换)
    async getEnvironment() {
        return this.config.host + this.config.app_id
    }

    // 保存预支付(扫码支付)返回结果()
    static async savePrecreate({out_trade_no, qr_code}) {
        return Alipay.savePrecreateModel({out_trade_no}, {$set: {qr_code}})
    }

    // 私有方法
    async _buildParams(payOrder) {
        return buildParams.call(this, payOrder)
    }

    async _handleParamsBefore() {
        return handleParamsBefore.call(this)
    }

    async _handleParamsSelect(selectArray) {
        return handleParamsSelect.call(this, selectArray)
    }

    async _handleParamsChildSelect(selectChildArray) {
        return handleParamsChildSelect.call(this, selectChildArray)
    }

    async _handleChildObj() { // JSON.stringify(...)
        return handleChildObj.call(this)
    }

    async _handleParamsAfter(sign) {
        return handleParamsAfter.call(this, sign)
    }

    async _buildQsBody(params) {
        return buildQsBody.call(this, params)
    }

    async _sign(key) {
        return sign.call(this, key)
    }

    async _signVerifySync(body, method) {
        console.log('[_signVerifySync ************]', body, method);
        return signVerifySync.call(this, body, method)
    }

    async _signVerifyAsync(body) {
        return signVerifyAsync.call(this, body)
    }

    async _signVerifyBefore(body, method) {
        return signVerifyBefore.call(this, body, method)
    }

    async _signVerifyExecute(body) {
        return signVerifyExecute.call(this, body)
    }

    async _saveInDB() {
        return saveInDB.call(this)
    }

    async _linkParams() {
        return linkParams.call(this)
    }
}

module.exports = TAlipayAPI;

async function buildParams({method, out_trade_no, total_amount, subject, notify_url, timeout_express, trade_no, refund_amount} = {}) { // 赋初值undefined
    this.params = Object.assign({}, {
        app_id: this.config.app_id,
        method: method || this.method, // 接口名称
        charset: this.config.charset, // utf-8
        sign_type: this.config.sign_type, // RSA2
        version: this.config.version, // 版本 固定为1.0
        timestamp: TBase.generateTimeStamp(), // 时间戳
        notify_url: notify_url || this.config.notify_url, // 回调地址
        biz_content: { // 请求参数
            out_trade_no: out_trade_no || AlipayFactory.generateOutTradeNo(), // 商户订单号
            total_amount: total_amount || this.total_amount, // 订单总金额
            subject: subject || this.subject, // 订单标题
            timeout_express: timeout_express || this.config.timeout_express, // 该笔订单允许的最晚付款时间 (15m)
            trade_no: trade_no || '', // 支付宝交易号(String)
            refund_amount: refund_amount || '' // 退款金额
        }
    })
}

async function handleParamsSelect(selectArray) {
    this.params = _.pick(this.params, selectArray)
}

async function handleParamsChildSelect(selectChildArray) {
    // 1.找出biz_content
    // 2.选择需要的字段
    Object.assign(this.params, {biz_content: _.pick(this.params['biz_content'], selectChildArray)})
}

async function handleParamsBefore() {
    // 排序
    await this.sortParams();
    // 去空
    await this.filterParams();
    // 拼接(支付宝和微信不同，不需要拼接key) & 先拿出来单独写，然后再和微信合并在一起
    await this._linkParams()
}

async function linkParams() {
    this.linkStr = ecDo.setUrlPrmt(this.params)
}

async function handleParamsAfter(sign) {
    Object.assign(this.params, {sign})
    // delete this.params['key']
}

// 将biz_content中的内容变换成字符串JSON.stringify(...)
async function handleChildObj() {
    Object.keys(this.params).forEach((key) => {
        if (typeof this.params[key] === 'object') {
            Object.assign(this.params, {[key]: JSON.stringify(this.params[key])})
        }
    })
}

// 生成转义字符串
async function buildQsBody({params} = {}) {
    let paramsQs = params || this.params;
    return qs.stringify(paramsQs)
}

// 签名
async function sign() {
    if (this.linkStr.length !== 0) {
        const {privateKeyPath} = this.config;
        const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
        return require('crypto').createSign('RSA-SHA256')
            .update(this.linkStr)
            .sign(privateKey, 'base64')
    }
}

/**
 * 同步
 * 验证签名 step1 入口
 * @param body
 * @param method
 * @returns {Promise<*>}
 */
async function signVerifySync(body, method) {
    const {signStr, sign} = await this._signVerifyBefore(body, method);
    return await this._signVerifyExecute({signStr, sign})
}

/**
 * 验证签名 step2 参数处理
 * (例如http://seei.tv >>> http:\/\/seei.tv)
 * @param body
 * @param method
 * @returns {Promise<{signStr: string, sign: *}>}
 * 1.预支付 ---  alipay_trade_precreate_response
 * 2.查询   ---  alipay_trade_query_response
 * 3.退款   ---  alipay_trade_refund_response
 * 4.关闭   ---  alipay_trade_cancel_response
 */
async function signVerifyBefore(body, method) {

    let {
        [`alipay_trade_${method}_response`]: response,
        sign
    } = body;

    let signStr = JSON.stringify(response);
    signStr = signStr.replace(/\//g, '\\/');

    return {signStr, sign}
}

/**
 * 验证签名 step3 执行验签函数
 * @param signStr 待验证字符串
 * @param sign  签名
 * @returns {Promise<boolean>} true/false
 */
async function signVerifyExecute({signStr, sign}) {
    const verify = require('crypto').createVerify('RSA-SHA256');
    verify.update(signStr);

    const {publicKeyPath} = this.config;
    const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    return verify.verify(publicKey, sign, 'base64')
}

/**
 * 异步
 * 验证签名 step1 入口
 * @param body
 * @returns {Promise.<void>}
 */
async function signVerifyAsync(body, method) {
    // 1.先测一下body的数据类型(string/object)
    // 待验签字符串，需要除去sign和sign_type
    // sign要放在一个单独的变量中
    // 2. 我先把body默认定义为Object对象
    const {sign} = _.pick(body, 'sign');
    const signStr = _.omit(body, 'sign');

    // const {} = await this._signVerifyBefore() // ??? 看情况是否需要对参数进行处理
    return await this._signVerifyExecute({signStr, sign})
}

async function saveInDB() {
    const filterArray = ['subject', 'out_trade_no', 'total_amount', 'timestamp', 'method'];
    const filterParams = {};
    Object.keys(this.params).forEach((key) => {
        if (typeof this.params[key] === 'object') {
            Object.assign(filterParams, _.pick(this.params[key], filterArray))
        }
        Object.assign(filterParams, _.pick(this.params, filterArray))
    });
    const saveCb = await Alipay.create(filterParams);
    if (!saveCb) {
        throw new Error('保存订单失败 mongodb error')
    }
}

/*
* options : {
*   appid_id:'',
*   charset:'',
*   sign_type:'',
*   version:''
* }
*
* */

// {
//   alipay_trade_precreate_response:{
//     code: '10000',
//     msg: 'Success',
//     out_trade_no: '20180411346659',
//    qr_code: 'https://qr.alipay.com/bax07348drwyka11bpld0079'
//     },
//   sign: 'RwkX95Cy+eJwj2AP5hFjpZ7H/XC/O8CsQ/0ucK/isQzScd63LBiLIA4FRyPo6zNWPi2yr56o5CjTj6eKJj/2RYf5X3puYlTDMChG1zGSafN9DH1tdZFmZPmDAi+GN32tvqViyk3rFomwxwnnvOv2SVumSs3s5pgfxOEbE5VPeV7ci/nuTgF11iDLcH09KjLkLKtK6+vhecvAVP4NiTgrt8FFSNv/027/q0SyCJUJQWnU6Oa/iUX7ISJVfJEfCnW0fcqAGiFI5LXk2ijirYBH8FkEAwSI18dbfMy8kFFVrAbaHhEPhjHMVYsqolVfXI7oZEACdfpfH+EhWmD5mvLihg==' }
// }