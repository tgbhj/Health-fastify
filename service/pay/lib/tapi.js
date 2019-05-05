const TWeixinPayAPI = require('./twx');
const TAlipayAPI = require('./talipay');

module.exports = {
  TYPES: {
    twxpay: TWeixinPayAPI,
    talipay: TAlipayAPI
  },
  enables: {}
};