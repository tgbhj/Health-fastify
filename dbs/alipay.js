const mongoose = require("mongoose");

const alipaySchema = mongoose.Schema({
    user_id: {type: mongoose.Schema.ObjectId, ref: "hhluser"},
    app_id: String,
    subject: String, // 订单标题
    body: String, // 商品描述
    out_trade_no: String, // 商戶订单号
    total_amount: String, // 订单总金额
    payStatus: {type: Number, default: 0}, // 支付状态 0:未支付 1:支付成功 2:支付失败 3:订单已关闭
    timestamp: String, // 时间戳
    method: String, // 接口类型
    qr_code: String, // 二维码url
    gmt_create: String, // 交易创建时间
    gmt_payment: String, // 交易付款时间
    notify_time: String, // 通知时间
    buyer_id: String, // 买家支付宝用户号
    invoice_amount: String, // 开票金额
    notify_id: String, // 通知校验ID
    fund_bill_list: String, // 支付金额信息
    notify_type: String, // 通知类型
    trade_no: String, // 支付宝交易号
    receipt_amount: String, // 实收金额
    seller_id: String, // 卖家支付宝用户号
    refundStatus: {type: Number, default: 0}, // 退款状态 0:未退款 1:已退款
    buyer_logon_id: String, // 用户的登录id
    buyer_user_id: String, // 买家在支付宝的用户id
    fund_change: String, // 本次退款是否发生了资金变化
    gmt_refund_pay: String, // 退款支付时间 2014-11-27 15:45:57
    refund_fee: String // 退款总金额
});

const alipay = mongoose.model("alipay", alipaySchema);

module.exports = alipay;