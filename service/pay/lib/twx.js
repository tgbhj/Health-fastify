/**
 * 微信支付
 * */

const TBase = require('./tbase');
const ecDo = require('../../../service/ec-do/src/ec-do-2.0.0');
const md5 = require('blueimp-md5');
const xml2js = require('xml2js');
const Pay = require('../../../dbs/wxpay');
const _ = require('underscore');
const fs = require('fs');

class TWeixinPayAPI extends TBase {
    constructor(options) {
        let config = {
            host: 'https://api.mch.weixin.qq.com/',
            unified_order: 'pay/unifiedorder',
            query_order: 'pay/orderquery',
            refund: 'secapi/pay/refund',
            query_refund: 'pay/refundquery',
            close_order: 'pay/closeorder',
        };
        super();
        config = Object.assign({}, config, options);
        this.paytype = 'twx';
        this.config = config;
        this.linkStr = ''; // 拼接完成字符串
        this.reqXml = ''; // <xml>格式字符串
        this.params = {} // 参数准备，开始处理
    }

    // 统一下单请求url
    getUnifiedOrderUrl() {
        return this.config.host + this.config.unified_order
    }

    // 查询订单
    getQueryOrderUrl() {
        return this.config.host + this.config.query_order
    }

    // 申请退款
    getRefundUrl() {
        return this.config.host + this.config.refund
    }

    // 查询退款
    getRefundQueryUrl() {
        return this.config.host + this.config.query_refund
    }

    // 关闭订单
    getCloseOrderUrl() {
        return this.config.host + this.config.close_order
    }

    /*
    * 修改
    * 可以在初始化时，
    *   this.bodyValid = xxx
    *   this.totalFeeValid = xxx
    * 也会触发set xxx() 方法
    * */
    set totalFeeValid(value) {
        if (value <= 0) {
            throw new Error('金额必须 > 0')
        } else {
            this.total_fee = parseInt(value)
        }
    }

    set bodyValid(str) { // 检测开头title
        const regexp = /^Seeitv充值中心-/;
        if (regexp.test(str)) {
            this.body = str
        } else {
            this.body = 'Seeitv充值中心-' + str
        }
    }

    /*
     * 统一下单
     * 1.生成基本参数  && 保存订单到数据库 && 参数处理
     * 2.签名
     * 3.转成xml
     * 4.封装 && 发送请求
     * 5.返回結果
     * */
    async createUnifiedOrder() {
        // 1.
        const selectArray = ['appid', 'mch_id', 'nonce_str', 'sign_type', 'body', 'out_trade_no', 'total_fee', 'spbill_create_ip', 'notify_url', 'trade_type'];
        await this._buildParams();
        const out_refund_no = await this._saveInDB(); // 退款码
        await this._handleParamsSelect(selectArray);
        await this._handleParamsBefore();
        // 2.
        const _sign = await this._sign();
        // 3.
        await this._handleParamsAfter(_sign);
        await this._buildXML();
        // 4.
        const options = {
            method: 'POST',
            uri: this.getUnifiedOrderUrl(),
            body: this.reqXml,
            json: true
        };
        const reqCb = await TBase._request({options});
        // 5.
        return Object.assign({}, await this._parseXML(reqCb),
            {
                out_trade_no: this.params['out_trade_no'],
                out_refund_no,
            })
    }

    // 更新订单状态
    static async updateOrderState({out_trade_no, transaction_id}) {
        const order = await Pay.findOne({out_trade_no});
        if (order.payStatus === 0) {
             // ??? Pay.update()有问题
            return Pay.updateNotifyOrderModel({out_trade_no}, {$set: {payStatus: 1, transaction_id}});
             // 订单支付成功
        } else if (order.payStatus === 1) {
            return false // 此订单已经完成
        }
    }

    /*
    * 查询订单
    * 1.生成基本参数 && 选择需要的字段 && 参数处理
    * 2.签名
    * 3.转成xml
    * 4.封装发送请求
    * 5.返回结果
    * */
    async createQueryOrder({out_trade_no}) {
        // 1.
        const selectArray = ['appid', 'mch_id', 'out_trade_no', 'nonce_str', 'sign_type']; // 'sign'
        await this._buildParams({out_trade_no});
        await this._handleParamsSelect(selectArray);
        await this._handleParamsBefore();
        // 2.
        const _sign = await this._sign();
        // 3.
        await this._handleParamsAfter(_sign);
        await this._buildXML();
        // 4.
        const options = {
            method: 'POST',
            uri: this.getQueryOrderUrl(),
            body: this.reqXml,
            json: true
        };
        const reqCb = await TBase._request({options});
        // 5.
        return this._parseXML(reqCb)
    }

    /*
    * 申请退款
    * params = {out_trade_no, total_fee, refund_fee, notify_url, out_refund_no}
    * */
    async createRefund(params) {
        // 1.out_trade_no && total_fee && refund_fee && notify_url
        const selectArray = ['appid', 'mch_id', 'out_trade_no', 'nonce_str', 'sign_type', 'out_refund_no', 'total_fee', 'refund_fee', 'notify_url'];
        await this._buildParams(params);
        await this._handleParamsSelect(selectArray);
        await this._handleParamsBefore();
        // 2.
        const _sign = await this._sign();
        // 3.
        await this._handleParamsAfter(_sign);
        await this._buildXML();
        // 4.
        const options = {
            method: 'POST',
            uri: this.getRefundUrl(),
            body: this.reqXml,
            json: true,
            agent: {
                // pfx: this.config.pfx, // 微信证书
                pfx: fs.readFileSync(this.config.pfxPath, 'utf8'),
                passphrase: this.config.mch_id
            }
        };
        const reqCb = await TBase._request({options});
        // 5.
        return this._parseXML(reqCb)
    }

    /*
    *查询退款
    *out_refund_no: 微信退款单号
    * */
    async createRefundQuery({refund_id}) {
        const selectArray = ['appid', 'mch_id', 'refund_id', 'nonce_str', 'sign_type'];
        await this._buildParams({refund_id});
        await this._handleParamsSelect(selectArray);
        await this._handleParamsBefore();
        // 2.
        const _sign = await this._sign();
        // 3.
        await this._handleParamsAfter(_sign);
        await this._buildXML();
        // 4.
        const options = {
            method: 'POST',
            uri: this.getRefundQueryUrl(),
            body: this.reqXml,
            json: true
        };
        const reqCb = await TBase._request({options});
        // 5.
        return this._parseXML(reqCb)
    }

    /*
    * 关闭订单
    * out_trade_np: 商户订单号
    * */
    async createCancelOrder({out_trade_no}) {
        const selectArray = ['appid', 'mch_id', 'out_trade_no', 'nonce_str', 'sign_type'];
        await this._buildParams({out_trade_no});
        await this._handleParamsSelect(selectArray);
        await this._handleParamsBefore();
        const _sign = await this._sign();
        await this._handleParamsAfter(_sign);
        await this._buildXML();

        const options = {
            method: 'POST',
            uri: this.getCloseOrderUrl(),
            body: this.reqXml,
            json: true
        };

        const reqCb = await TBase._request({options});
        return this._parseXML(reqCb)
    }

    // 封装返回码('SUCCESS' && 'FAIL') & XML格式
    async returnCode(state) {
        return this._buildXML(state)
    }

    // 错误码 >>> 错误信息
    static async errCodeReturn(apiMode, errCode) {
        const errArray = {
            unifiedorder: { // 统一下单
                NOAUTH: '商户无此接口权限',
                NOTENOUGH: '余额不足',
                ORDERPAID: '商户订单已支付',
                ORDERCLOSED: '订单已关闭',
                SYSTEMERROR: '系统错误',
                APPID_NOT_EXIST: 'APPID不存在',
                MCHID_NOT_EXIST: 'MCHID不存在',
                APPID_MCHID_NOT_MATCH: 'appid和mch_id不匹配',
                LACK_PARAMS: '缺少参数',
                OUT_TRADE_NO_USED: '商户订单号重复',
                SIGNERROR: '签名错误',
                XML_FORMAT_ERROR: 'XML格式错误',
                REQUIRE_POST_METHOD: '请使用post方法',
                POST_DATA_EMPTY: 'post数据为空',
                NOT_UTF8: '编码格式错误',
            },
            orderquery: {  // 查询订单
                ORDERNOTEXIST: '此交易订单号不存在',
                SYSTEMERROR: '系统错误'
            },
            refund: {   // 申请退款
                SYSTEMERROR: '接口返回错误',
                BIZERR_NEED_RETRY: '退款业务流程错误',
                ORDERNOTEXIST: '订单不存在',
                TRADE_OVERDUE: '订单已经超过退款期限',
                ERROR: '业务错误', // 订单已全额退款
                USER_ACCOUNT_ABNORMAL: '退款请求失败',
                INVALID_REQ_TOO_MUCH: '无效请求过多',
                NOTENOUGH: '余额不足',
                INVALID_TRANSACTIONID: '无效transaction_id',
                PARAM_ERROR: '参数错误',
                APPID_NOT_EXIST: 'APPID不存在',
                MCHID_NOT_EXIST: 'MCHID不存在',
                REQUIRE_POST_METHOD: '请使用post方法',
                SIGNERROR: '签名错误',
                XML_FORMAT_ERROR: 'XML格式错误',
                FREQUENCY_LIMITED: '频率限制',
            },
            refundquery: { // 查询退款订单
                SYSTEMERROR: '接口返回错误',
                REFUNDNOTEXIST: '退款订单查询失败',
                INVALID_TRANSACTIONID: '无效transaction_id',
                PARAM_ERROR: '参数错误',
                APPID_NOT_EXIST: 'APPID不存在',
                MCHID_NOT_EXIST: 'MCHID不存在',
                REQUIRE_POST_METHOD: '请使用post方法',
                SIGNERROR: '签名错误',
                XML_FORMAT_ERROR: 'XML格式错误',
            },
            closeorder: { // 关闭订单
                ORDERPAID: '订单已支付',
                SYSTEMERROR: '系统错误',
                ORDERCLOSED: '订单已关闭',
                SIGNERROR: '签名错误',
                REQUIRE_POST_METHOD: '请使用post方法',
                XML_FORMAT_ERROR: 'XML格式错误',
            }
        };

        return errArray[apiMode][errCode]
    }

    // 验证签名 公有方法
    async signVerifyPub(body) {
        return await this._signVerify(body)
    }

    /*
    * 1.验证签名
    * 2.验证支付金额
    * */
    async signVerifyAndCheckFeePub(body) {
        // 1.
        const signRes = await this._signVerify(body);
        // 2.
        const checkCbRes = await this._checkCallbackParams(body);
        return !!(signRes && checkCbRes);
    }

    // 保存统一下单返回结果(prepay_id & trade_type & code_url)
    static async saveUnifiedOrder({out_trade_no, prepay_id, trade_type, code_url}) {
        return Pay.saveUnifiedOrderModel({out_trade_no}, {$set: {prepay_id, trade_type, code_url}})
    }

    // 查询支付状态
    static async checkPayStatus({out_trade_no}) {
        return Pay.checkPayStatusModel({out_trade_no}, {select: {_id: 0, payStatus: 1}})
    }

    // 更新退款状态
    static async updateRefundMsg({out_trade_no, refund_id, refund_fee}) {
        return Pay.updateRefundMsgModel({out_trade_no}, {refund_id, refund_fee, refundStatus: 1})
    }

    // 更新关闭订单状态
    static async updateCloseOrder({out_trade_no}) {
        console.log('[updateCloseOrder]', out_trade_no);
        return Pay.updateCloseOrderModel({out_trade_no}, {$set: {payStatus: 2}})
    }

    // 查询退款状态
    static async checkRefundStatus({out_trade_no}) {
        return Pay.checkRefundStatusModel({out_trade_no}, {select: {_id: 0, refundStatus: 1}})
    }

    // 查询订单是否存在
    static async checkOrder({out_trade_no}) {
        return Pay.findOne({out_trade_no})
    }

    /*
    * 1._开头为自定义的私有方法
    * 2.后续结合支付宝 && 把部分私有方法放到TBase中做共用方法
    * */
    async _buildParams(payOrder) {
        return buildParams.call(this, payOrder)
    }

    async _handleParamsBefore() {
        return handleParamsBefore.call(this)
    }

    async _handleParamsAfter(sign) {
        return handleParamsAfter.call(this, sign)
    }

    async _handleParamsSelect(selectArray) {
        return handleParamsSelect.call(this, selectArray)
    }

    async _sign() {
        return sign.call(this)
    }

    async _signVerify(body) {
        return signVerify.call(this, body)
    }

    async _checkCallbackParams(body) {
        return checkCallbackParams.call(this, body)
    }

    async _buildXML(params) {
        return buildXML.call(this, params)
    }

    async _parseXML(xml) {
        return parseXML.call(this, xml)
    }

    async _saveInDB() {
        return saveInDB.call(this)
    }
}

module.exports = TWeixinPayAPI;

async function buildParams({nonce_str, body, out_trade_no, total_fee, refund_fee, notify_url, out_refund_no, refund_id} = {}) {
    this.params = Object.assign({}, {
        appid: this.config.appid,
        mch_id: this.config.mch_id,
        nonce_str: nonce_str || TBase.generateRandomStrings(),
        sign_type: this.config.sign_type,
        body: body || this.body,
        out_trade_no: out_trade_no || TBase.generateOutTradeNo(),
        total_fee: parseInt(total_fee) || this.total_fee,
        spbill_create_ip: this.config.spbill_create_ip, // 本机IP
        notify_url: notify_url || this.config.notify_url, // 回调地址
        trade_type: this.config.trade_type,
        refund_fee: parseInt(refund_fee),
        out_refund_no: out_refund_no || 'refund-' + TBase.generateOutRefundNo(), // 退款码
        refund_id: refund_id || '' // 微信退款单号
    })
}

async function handleParamsBefore() {
    // 排序
    await this.sortParams();
    // 去空
    await this.filterParams();
    // 拼接
    await this.linkParams()
}

async function handleParamsAfter(sign) {
    Object.assign(this.params, {sign});
    delete this.params['key']
}

async function handleParamsSelect(selectArray) {
    this.params = _.pick(this.params, selectArray)
}

async function sign() {
    if (this.linkStr.length !== 0) {
        return md5(this.linkStr).toUpperCase()
    }
}

// 验证签名
async function signVerify(body) {
    this.params = {};
    this.params = body;
    await this._handleParamsBefore();
    const signRes = await this._sign();
    return signRes === body['sign'];
}

// 比对 订单号、随机字符串、支付金额
async function checkCallbackParams(body) {
    const {out_trade_no, total_fee} = body;
    let payOrder = await Pay.findOne({out_trade_no});
    const total_fee_int = parseInt(total_fee);
    return total_fee_int === payOrder['total_fee'];
}

// 生成xml
function buildXML({params} = {}) {
    let paramsToXml = params || this.params;
    const builder = new xml2js.Builder({rootName: 'xml'});
    return builder.buildObject(paramsToXml)
}

// 解析xml
async function parseXML(data) {
    return new Promise((resolve, reject) => {
        const parser = new xml2js.Parser({trim: true, explicitArray: false, explicitRoot: false});
        parser.parseString(data, function (err, result) {
            if (err) {
                reject(err)
            }
            resolve(result)
        })
    })
}

async function saveInDB() {
    const filterArray = ['body', 'nonce_str', 'out_trade_no', 'total_fee', 'out_refund_no'];
    const filterParams = _.pick(this.params, filterArray);
    const saveCb = await Pay.create(filterParams);
    if (!saveCb) {
        throw new Error('保存订单失败 mongodb error')
    }
    return saveCb['out_refund_no']
}

// 模式2，比较简单
// 统一下单: URL地址：https://api.mch.weixin.qq.com/pay/unifiedorder

//    config{
//    appid: ...
//    mch_id: ...
//    sign_type: ...
// }

// params:{
//      spbill_create_ip:'本机IP'
//      notify_url:'回调地址'
//      trade_type:'NATIVE'
// }

// 1.取出数据信息
// const {
//   bank_type, // 付款银行
//   cash_fee,
//   is_subscribe, // 是否订阅公众号
//   nonce_str, // 随机字符串
//   out_trade_no, // 商户订单号(自己生成)
//   sign,// 签名
//   total_fee, // 总金额
//   trade_type, // 支付类型(扫码支付)
//   transaction_id, // 微信支付订单号
// } = body