const {log} = console;
const TWeixinPayAPI = require('../lib/twx');
const {
    pay_wx_appid,
    pay_wx_mch_id,
    pay_wx_key,
    pay_sign_type,
    pay_notify_url,
    pay_spbill_create_ip,
} = require('../../../config/config');
const twx = new TWeixinPayAPI({
    appid: pay_wx_appid,
    mch_id: pay_wx_mch_id,
    sign_type: pay_sign_type,
    key: pay_wx_key,
});

async function test() {
    try {
        // twx.money = 123
        // twx.money = -1
        // 实例的属性
        log(Object.getOwnPropertyNames(twx));
        // 实例的方法
        // log(Object.getOwnPropertyNames(twx.__proto__))

        // log(twx.total_fee)

        twx.totalFeeValid = 1;
        twx.bodyValid = '直播费用';
        const params = {
            spbill_create_ip: pay_spbill_create_ip,
            notify_url: pay_notify_url,
            trade_type: 'NATIVE',
        };
        // log('[twx._sign]', await twx.unifiedOrder({params}))
        twx.createUnifiedOrder({params})
            .then(res => {
                log('[test/twx/res]', res)
            })
            .catch(err => {
                log('[test/twx/err]', err.message)
            })
    } catch (_err) {
        console.log(_err)
    }
}

test();

// class Point {
//   constructor() {
//   }
//
//   getName() {
//     log('[getName]', this)
//   }
// }
//
// const p = new Point()
// p.getName()
//
// class Child extends Point {
//   constructor() {
//     super()
//   }
//
//   getNameChild() {
//     super.getName()
//   }
//
//   _getOutTradeNo() {
//     getOutTradeNo.call(this)
//   }
// }
//
// function getOutTradeNo() {
//   log('[ABC]')
// }
//
// const c = new Child()
// c.getNameChild()
// c.getName()
// c._getOutTradeNo()
// c.getOutTradeNo()