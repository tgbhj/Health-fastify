const admin = require('./admin');
const channel = require('./channel');
const danmu = require('./danmu');
const doctor = require('./doctor');
const huatai = require('./huatai');
const info = require('./info');
const line = require('./line');
const question = require('./question');
const search = require('./search');
const user = require('./user');
const vcode = require('./vcode');
const video = require('./video');
const billQuery = require('./PCAlipayTradeBillQuery');
const close = require('./PCAlipayTradeClose');
const fastPayRefundQuery = require('./PCAlipayTradeFastPayRefundQuery');
const pagePay = require('./PCAlipayTradePagePay');
const query = require('./PCAlipayTradeQuery');
const alirefund = require('./PCAlipayTradeRefund');
const alinotify = require('./PCAlipayFormUrlNotify');
const alireturn = require('./PCAlipayFormUrlReturn');
const closeOrder = require('./WxpayCloseOrder');
const downloadBill = require('./WxpayDownloadBill');
const orderQuery = require('./WxpayOrderQuery');
const wxrefund = require('./WxpayRefund');
const refundQuery = require('./WxpayRefundQuery');
const unifiedorder = require('./WxpayUnifiedorder');
const wxnotify = require('./WxpayUrlNotify');

const routers = [
    {
        prefix: '/api',
        routes: admin,
    },
    {
        prefix: '/api',
        routes: channel,
    },
    {
        prefix: '/api',
        routes: danmu,
    },
    {
        prefix: '/api',
        routes: doctor,
    },
    {
        prefix: '/api',
        routes: huatai,
    },
    {
        prefix: '/api',
        routes: info,
    },
    {
        prefix: '/api',
        routes: line,
    },
    {
        prefix: '/api',
        routes: question,
    },
    {
        prefix: '/api',
        routes: search,
    },
    {
        prefix: '/api',
        routes: user,
    },
    {
        prefix: '/api',
        routes: vcode,
    },
    {
        prefix: '/api',
        routes: video,
    },
    {
        prefix: '/api',
        routes: billQuery,
    },
    {
        prefix: '/api',
        routes: close,
    },
    {
        prefix: '/api',
        routes: fastPayRefundQuery,
    },
    {
        prefix: '/api',
        routes: pagePay,
    },
    {
        prefix: '/api',
        routes: query,
    },
    {
        prefix: '/api',
        routes: alirefund,
    },
    {
        prefix: '/api',
        routes: alinotify,
    },
    {
        prefix: '/api',
        routes: alireturn,
    },
    {
        prefix: '/api',
        routes: closeOrder,
    },
    {
        prefix: '/api',
        routes: downloadBill,
    },
    {
        prefix: '/api',
        routes: orderQuery,
    },
    {
        prefix: '/api',
        routes: wxrefund,
    },
    {
        prefix: '/api',
        routes: refundQuery,
    },
    {
        prefix: '/api',
        routes: unifiedorder,
    },
    {
        prefix: '/api',
        routes: wxnotify,
    }
];

module.exports = routers;