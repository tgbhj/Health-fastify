const mongoose = require("mongoose");
const moment = require('moment');

const wxpaySchema = mongoose.Schema({
    user_id: {type: mongoose.Schema.ObjectId, ref: "hhluser"},
    body: String,
    nonce_str: String,
    out_trade_no: String, // 商户订单号
    total_fee: Number, // 单位:分
    payStatus: {type: Number, default: 0}, // 支付状态 0:未支付 1:支付成功 2:支付失败
    prepay_id: String, // 2小时有效期，暂时放着
    time_start: {type: String, default: moment().format('YYYY-MM-DD HH:mm:ss')}, // 交易开始时间，保留
    time_expire: {type: String, default: moment().add({minutes: 15}).format('YYYY-MM-DD HH:mm:ss')}, // 交易结束时间，保留 & 15分钟支付时间
    transaction_id: String, // 微信的订单号，建议优先使用(查询订单用)
    out_refund_no: String, // 商户退款单号
    refundStatus: {type: Number, default: 0}, // 退款状态 0:未退款 1:已退款
    refund_id: String, // 微信退款单号 --- 查询退款用
    refund_fee: Number, // 退款金额
    trade_type: String, // 交易类型
    code_url: String, // 二维码url
    bank_type: String,
    fee_type: String,
    openid: String,
    time_end: String,
    cashRefundFee: String
});

const wxpay = mongoose.model("wxpay", wxpaySchema);

module.exports = wxpay;