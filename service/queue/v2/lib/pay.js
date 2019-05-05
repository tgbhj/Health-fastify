/**
 * 功能: 用于支付查询订单和撤销订单
 * 1.参数: 'wxpay'和'alipay'
 * 2.查询订单:
 *  wxpay/alipay: createQueryOrder({out_trade_no})
 * 3.关闭订单:
 *  wxpay: createCloseOrder({out_trade_no})
 *  alipay: createCloseOrder({out_trade_no, trade_no})
 * */
let {talipay, twxpay} = require('../../../pay/');

exports.TYPE = {
    'alipay': talipay,
    'wxpay': twxpay
};

/**
 * 查询订单
 * type: wxpay/alipay
 * out_trade_no: 商户订单号
 * return: promise
 * */
exports.queryOrder = async function (type, out_trade_no) {
    let payload = await exports.TYPE[type].createQueryOrder({out_trade_no});
    console.log('[pay.js.payload]', payload); // 交易不存在???
    let method = 'alipay_trade_query_response';
    let tradeStatus = null;

    type === 'alipay'
        ? tradeStatus = payload[method]['trade_status']
        : tradeStatus = payload['trade_state'];

    return tradeStatus
};

/**
 * 撤销订单
 * type: wxpay/alipay
 * out_trade_no: 商户订单号
 * trade_no: alipay用(支付宝out_trade_no和trade_no两选一)
 * return: promise
 * */
exports.cancelOrder = async function (type, out_trade_no, trade_no) {
    // if (arguments.length === 2 && type === 'wxpay') {
    //   return exports.TYPE[type].createCloseOrder({out_trade_no})
    // }
    // else {
    //   return exports.TYPE[type].createCloseOrder({out_trade_no, trade_no})
    // }

    return exports.TYPE[type].createCancelOrder({out_trade_no})

    // 支付宝
    // out_trade_no: 原支付请求的商户订单号,和支付宝交易号不能同时为空
    // trade_no: 支付宝交易号，和商户订单号不能同时为空
    // 是否可以不传trade_no, 需要测试

};

// 可行
// console.log(exports.TYPE['alipay'])
// console.log(exports.TYPE['wxpay'])