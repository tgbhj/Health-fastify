/***
 * PC电脑网站支付, 轮询用
 * 1.queue.js.queryOrder()使用
 * 2.接收2个参数:
 *  (1)out_trade_no
 *  (2)type
 * 3.
 * */
const AlipayFactory = require('./factory');
const alipayFactory = new AlipayFactory({method: 'query'});
const WxpayFactory = require('./wfactory'); // 未实现
const wxpayFactory = new WxpayFactory(); // 未实现
const camelCaseKeys = require('camelcase-keys');
const snakeCaseKeys = require('snakecase-keys');

exports.PAY_TYPE_MAPPING = {
  'alipay': alipayFactory,
  // 'wxpay': wxpayFactory
};

/***
 * 查询订单状态
 * @param out_trade_no
 * @param type
 * @returns {boolean}
 */
exports.queryOrder = async function () {
  try {
    let worker = this; // job实例
    let jobJson = worker.Json();
    console.log('[p2-2][JSON.parse(jobJson[data])]', JSON.parse(jobJson['data']), typeof JSON.parse(jobJson['data']));
    let loopParams = {
      outTradeNo: JSON.parse(jobJson['data'])['out_trade_no'],
      type: jobJson['type'],
      maxAttempts: jobJson['max_attempts'],
      attempts: jobJson['attempts']
    };

    // p2
    console.log('[p2][exports.queryOrder.outTradeNo]', loopParams['outTradeNo']);
    console.log('[p2][exports.queryOrder.type]', loopParams['type']);
    console.log('[p2][exports.queryOrder.maxAttempts]', loopParams['maxAttempts']);
    console.log('[p2][exports.queryOrder.attempts]', loopParams['attempts']);

    let tradeStatus = null;
    if (loopParams['type'] === 'alipay') {
      tradeStatus = await exports._alipayQuery(loopParams)
    }

    if (loopParams['type'] === 'wxpay') {
      tradeStatus = await exports._wxpayQuery(loopParams)
    }

    return tradeStatus
  } catch (err) {
    console.log('[p error]', err)
  }
};

/**
 * 支付宝
 * 1.根据out_trade_no, 查询订单.
 * 2.查询订单, 得到tradeStatus.
 * 3.根据tradeStatus, 做不同的业务处理.
 * */
exports._alipayQuery = function ({outTradeNo, maxAttempts, attempts}) {
  return new Promise((resolve, reject) => { // 返回一个promise盒子, 盒子中必然包含一个异步操作
    exports._toAlipayQuery(outTradeNo)
      .then((ret) => {
        // p3
        console.log('[p3][exports._alipayQuery.ret]', ret);
        // 对ret结果做处理
        const {tradeStatus, code} = ret;
        // p4
        console.log('[p4][exports._alipayQuery tradeStatus]', tradeStatus);
        if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISH') {
          // 交易成功
          resolve(true)
        }

        if (tradeStatus === 'WAIT_BUYER_PAY') {
          // 交易创建, 等待买家付款
          !(maxAttempts > attempts) && exports._toAlipayClose(outTradeNo); // 关闭订单
          resolve(false)
        }

        if (code === '40004') {
          resolve(false)
        }
      })
  })
};

/***
 * 支付宝, 查询订单
 * @param outTradeNo
 * @returns {Promise|Promise<AlipaySdkCommonResult | string>}
 * @private
 */
exports._toAlipayQuery = function (outTradeNo) {
  alipayFactory.setMethod('query');
  return alipayFactory.createAlipaySdk().exec(
    alipayFactory.ALIPAY_API_MAPPING,
    {
      bizContent: {
        outTradeNo
      }
    },
    {
      validateSign: true // 验签
    }
  )
};

/***
 * 支付宝, 关闭订单
 * @param outTradeNo
 * @private
 */
exports._toAlipayClose = function (outTradeNo) {
  alipayFactory.setMethod('close');
  alipayFactory.createAlipaySdk().exec(
    alipayFactory.ALIPAY_API_MAPPING,
    {
      bizContent: {
        outTradeNo
      }
    },
    {
      validateSign: true
    },
  )
    .then(closeRes => {
      console.log('[p4-2]关闭订单结果', closeRes)
    })
};

/***
 * 微信
 * @param outTradeNo
 * @param maxAttempts
 * @param attempts
 * @returns {Promise<any>}
 * @private
 */
exports._wxpayQuery = function ({outTradeNo, maxAttempts, attempts}) {
  return new Promise((resolve, reject) => {
    // 微信查询订单方法
    exports._toWxpayQuery(outTradeNo)
      .then(ret => {
        // p22
        console.log('[exports._wxpyQuery.ret]', ret);
        // 对ret结果做处理
        // const {trade_state} = ret
        // const {tradeState} = camelCaseKeys({trade_state}, {deep: true})
        const {tradeState} = ret;
        // p23
        console.log('[tradeState]', tradeState);

        if (tradeState === 'SUCCESS') {
          // 支付成功
          resolve(true)
        }

        if (tradeState === 'NOTPAY') {
          // 未支付, 等待买家付款
          !(maxAttempts > attempts) && exports._toWxpayClose(outTradeNo); // 关闭订单
          resolve(false)
        }
      })
  })
};

/***
 * 微信支付, 查询订单
 */
exports._toWxpayQuery = function (outTradeNo) {
  // const decamelizeParams = snakeCaseKeys({outTradeNo}) // 驼峰转成下划线
  // return wxpayFactory.createWxpaySdk().createQueryOrder(decamelizeParams)
  wxpayFactory.setMethod('orderquery');
  return wxpayFactory.createWxpaySdk2().exec(
    wxpayFactory.WXPAY_API_MAPPING,
    {
      outTradeNo
    },
    {
      validateSign: true
    }
  )
};

/**
 * 微信支付, 关闭订单
 * */
exports._toWxpayClose = function (outTradeNo) {
  // const decamelizeParams = snakeCaseKeys({outTradeNo})
  console.log('[exports._toWxpayClose]');
  wxpayFactory.setMethod('closeorder');
  wxpayFactory.createWxpaySdk2().exec(
    wxpayFactory.WXPAY_API_MAPPING,
    {
      outTradeNo
    },
    {
      validateSign: true
    }
  ).then(ret => {
    console.log('[exports._toWxpayClose关闭订单结果]', ret)
  })

  // wxpayFactory.createWxpaySdk().createCancelOrder(decamelizeParams)
  //   .then(ret => {
  //     // p24
  //     console.log('[exports._toWxpayClose关闭订单结果]', ret)
  //   })
};

/**
 * 微信支付状态
 * SUCCESS—支付成功
 * REFUND—转入退款
 * NOTPAY—未支付
 * CLOSED—已关闭
 * REVOKED—已撤销（刷卡支付）
 * USERPAYING--用户支付中
 * PAYERROR--支付失败(其他原因，如银行返回失败)
 */