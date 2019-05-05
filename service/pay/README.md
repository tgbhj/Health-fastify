##支付模块（微信支付、支付宝）

# 20180822 API

微信支付:

1.统一下单
请求路由: http://localhost:9009/auth/pay/wx2.0/
请求方式: post
请求参数: totalFee {String} 标价金额 订单总金额，单位为分 (1=0.01元)
         body {String} 商品描述 商品简单描述

2.查询订单
请求路由: http://localhost:9009/auth/wxpay/orderquery2.0/
请求方式: post
请求参数: outTradeNo {String} 商户订单号

3.关闭订单
请求路由: http://localhost:9009/auth/wxpay/closeorder2.0/
请求方式: post
请求参数: outTradeNo {String} 商户订单号

4.申请退款
请求路由: http://localhost:9009/auth/wxpay/refund2.0/
请求方式: post
请求参数: totalFee {String} 标价金额 订单总金额，单位为分 (1=0.01元)
         outTradeNo {String} 商户订单号

5.查询订单
请求路由: http://localhost:9009/auth/wxpay/refundquery2.0/
请求方式: post
请求参数: outTradeNo {String} 商户订单号

6.下载对账单
请求路由: http://localhost:9009/auth/wxpay/downloadbill2.0/
请求方式: post
请求参数: billDate {String} 对账单日期 下载对账单的日期，格式：20140603(T-1)
         billType {String} 账单类型 ALL 返回当日所有订单信息

#

支付宝

1.请求支付, 调起支付宝收银台
请求路由: http://localhost:9009/auth/alipay/pay2.0?totalAmount=0.01&subject=商品名称&body=商品描述
请求方式: get
请求参数: totalAmount {String} 订单总金额，单位为元
         subject {String} 订单标题
         body {String} 订单描述

2.查询订单
请求路由: http://localhost:9009/auth/alipay/query2.0/
请求方式: post
请求参数: outTradeNo {String} 商户订单号

3.关闭订单
请求路由: localhost:9009/auth/alipay/close2.0/
请求方式: post
请求参数: outTradeNo {String} 商户订单号

4.申请退款
请求路由: http://localhost:9009/auth/alipay/refund2.0/
请求方式: post
请求参数: outTradeNo {String} 商户订单号
         refundAmount {String} 需要退款的金额，该金额不能大于订单金额,单位为元，支持两位小数
         refundReason {String} 退款的原因说明

5.查询订单
请求路由: http://localhost:9009/auth/alipay/query2.0/
请求方式: post
请求参数: outTradeNo {String} 商户订单号

6.下载对账单
请求路由: http://localhost:9009/auth/alipay/billQuery2.0/
请求方式: post
请求参数: billDate {String} 账单时间 2016-04-05(T-1)
         billType {String} 账单类型 ALL 返回当日所有订单信息 trade
         

# 20180821
测试微信支付

1.下单
	(1)下单, 没有支付 --- payStatus:2 支付失败
	(2)下单, 立即支付 --- payStatus:1 支付成功
	(3)下单, 扫了码, 在轮询结束后, 再支付 --- 订单被关闭
	
2.查询

	(1)查询已支付订单
	{ return_code: 'SUCCESS',
	  return_msg: 'OK',
	  appid: 'wx315ac5d37a858129',
	  mch_id: '1274134501',
	  nonce_str: 'OQBeJk8IWPWXAJ0y',
	  sign: 'F4F43B65FF5B22BA49C172657BAC154C',
	  result_code: 'SUCCESS',
	  openid: 'o1IeduC5u5f5fGzX07bcKL2_bH14',
	  is_subscribe: 'Y',
	  trade_type: 'NATIVE',
	  bank_type: 'CFT',
	  total_fee: '1',
	  fee_type: 'CNY',
	  transaction_id: '4200000178201808215372967492',
	  out_trade_no: '20180821174779',
	  attach: '',
	  time_end: '20180821172539',
	  trade_state: 'SUCCESS',
	  cash_fee: '1',
	  trade_state_desc: '支付成功' }
	
	(2)查询未支付订单
	{ return_code: 'SUCCESS',
	  return_msg: 'OK',
	  appid: 'wx315ac5d37a858129',
	  mch_id: '1274134501',
	  nonce_str: 'gnYhUl9MsPt03hRk',
	  sign: '1D042A0DB2158695DB5AA66049B3A577',
	  result_code: 'SUCCESS',
	  out_trade_no: '20180821994268',
	  trade_state: 'NOTPAY',
	  trade_state_desc: '订单未支付' }

	(3)查询已关闭订单
	{ return_code: 'SUCCESS',
	  return_msg: 'OK',
	  appid: 'wx315ac5d37a858129',
	  mch_id: '1274134501',
	  nonce_str: 's0Rl3XKQLi7V7c9I',
	  sign: 'FFC508E360F522159ABCD9898B373E13',
	  result_code: 'SUCCESS',
	  out_trade_no: '20180821557015',
	  attach: '',
	  trade_state: 'CLOSED',
	  trade_state_desc: '订单已关闭' }
	
	(4)查询不存在订单
	{ return_code: 'SUCCESS',
	  return_msg: 'OK',
	  appid: 'wx315ac5d37a858129',
	  mch_id: '1274134501',
	  nonce_str: '4aYfknPXfQGHEhZT',
	  sign: 'C5E3AE52CA6D16008D61FCE01F743845',
	  result_code: 'FAIL',
	  err_code: 'ORDERNOTEXIST',
	  err_code_des: 'order not exist' }
	
	(5)查询已退款订单
	{ return_code: 'SUCCESS',
	  return_msg: 'OK',
	  appid: 'wx315ac5d37a858129',
	  mch_id: '1274134501',
	  nonce_str: 'njV20LkXtEPQ1hna',
	  sign: 'B9E3BFD6F4648492FFDAA463EA4E5511',
	  result_code: 'SUCCESS',
	  openid: 'o1IeduC5u5f5fGzX07bcKL2_bH14',
	  is_subscribe: 'Y',
	  trade_type: 'NATIVE',
	  bank_type: 'CFT',
	  total_fee: '1',
	  fee_type: 'CNY',
	  transaction_id: '4200000165201808217781847728',
	  out_trade_no: '20180821665587',
	  attach: '',
	  time_end: '20180821163406',
	  trade_state: 'REFUND',
	  cash_fee: '1',
	  trade_state_desc: '订单发生过退款，退款详情请查询退款单' }
	
	
3.退款

	(1)退款已支付订单
	{ return_code: 'SUCCESS',
	  return_msg: 'OK',
	  appid: 'wx315ac5d37a858129',
	  mch_id: '1274134501',
	  nonce_str: 'rXO9gjgeM1yOrdhB',
	  sign: 'FD5CBC9BCEF9143A48246B51930CE3F2',
	  result_code: 'SUCCESS',
	  transaction_id: '4200000165201808217781847728',
	  out_trade_no: '20180821665587',
	  out_refund_no: '20180821665587',
	  refund_id: '50000007722018082106052170678',
	  refund_channel: '',
	  refund_fee: '1',
	  coupon_refund_fee: '0',
	  total_fee: '1',
	  cash_fee: '1',
	  coupon_refund_count: '0',
	  cash_refund_fee: '1' }

	(2)退款未支付订单
	{ return_code: 'SUCCESS',
	  return_msg: 'OK',
	  appid: 'wx315ac5d37a858129',
	  mch_id: '1274134501',
	  nonce_str: 'YVWFIrmKumfDDK7k',
	  sign: 'B873E060B2DD25DB3FA7186E09E7097C',
	  result_code: 'FAIL',
	  err_code: 'ORDERNOTEXIST',
	  err_code_des: '订单不存在' }

	(3)退款已关闭订单
	{ return_code: 'SUCCESS',
	  return_msg: 'OK',
	  appid: 'wx315ac5d37a858129',
	  mch_id: '1274134501',
	  nonce_str: 'UoJAVWzefWx3XnNw',
	  sign: '608C6202153F2F0086ACE4F05AC053A0',
	  result_code: 'FAIL',
	  err_code: 'ERROR',
	  err_code_des: '订单已关闭' }

	(4)退款不存在订单
	{ return_code: 'SUCCESS',
	  return_msg: 'OK',
	  appid: 'wx315ac5d37a858129',
	  mch_id: '1274134501',
	  nonce_str: 'YcHoNfCT6PQec7YD',
	  sign: 'EBF22C679FF39C06CA4C333024509A8D',
	  result_code: 'FAIL',
	  err_code: 'ORDERNOTEXIST',
	  err_code_des: '订单不存在' }

	(5)退款已退款订单
	{ returnCode: 'SUCCESS',
	  returnMsg: 'OK',
	  appid: 'wx315ac5d37a858129',
	  mchId: '1274134501',
	  nonceStr: 'dIy0owO6a6BugVk3',
	  sign: 'D509B692D029EB43CABABF3517E57435',
	  resultCode: 'SUCCESS',
	  transactionId: '4200000165201808217781847728',
	  outTradeNo: '20180821665587',
	  outRefundNo: '20180821665587',
	  refundId: '50000007722018082106052170678',
	  refundChannel: '',
	  refundFee: '1',
	  couponRefundFee: '0',
	  totalFee: '1',
	  cashFee: '1',
	  couponRefundCount: '0',
	  cashRefundFee: '1' }


4.退款查询

	(1)退款查询已支付订单
	{ appid: 'wx315ac5d37a858129',
	  err_code: 'REFUNDNOTEXIST',
	  err_code_des: 'not exist',
	  mch_id: '1274134501',
	  nonce_str: 'B9O0s3lbVHOcyUqy',
	  result_code: 'FAIL',
	  return_code: 'SUCCESS',
	  return_msg: 'OK',
	  sign: 'D82BA90AEB96EEE7C845FB7D371AB580' }
	
	(2)退款查询未支付订单
	{ appid: 'wx315ac5d37a858129',
	  err_code: 'REFUNDNOTEXIST',
	  err_code_des: 'not exist',
	  mch_id: '1274134501',
	  nonce_str: 'FfxwV9jEpUUpH3ou',
	  result_code: 'FAIL',
	  return_code: 'SUCCESS',
	  return_msg: 'OK',
	  sign: '5EAEC695A232653E4843F05353B54FEE' }

	(3)退款查询已关闭订单
	{ appid: 'wx315ac5d37a858129',
	  err_code: 'REFUNDNOTEXIST',
	  err_code_des: 'not exist',
	  mch_id: '1274134501',
	  nonce_str: 'dujAhL7pAqpGqb5X',
	  result_code: 'FAIL',
	  return_code: 'SUCCESS',
	  return_msg: 'OK',
	  sign: '0C0633BF03112AD79AF12A891CA023CA' }

	(4)退款查询不存在订单
	{ appid: 'wx315ac5d37a858129',
	  err_code: 'REFUNDNOTEXIST',
	  err_code_des: 'not exist',
	  mch_id: '1274134501',
	  nonce_str: '9tY7w6Yh7adpYPhL',
	  result_code: 'FAIL',
	  return_code: 'SUCCESS',
	  return_msg: 'OK',
	  sign: 'A444E5B0DD44E0C8F996B887DA7FF74F' }

	(5)退款查询已退款订单
	{ appid: 'wx315ac5d37a858129',
	  cash_fee: '1',
	  mch_id: '1274134501',
	  nonce_str: 'T5ljRwYYSHePS1gr',
	  out_refund_no_0: '20180821665587',
	  out_trade_no: '20180821665587',
	  refund_account_0: 'REFUND_SOURCE_UNSETTLED_FUNDS',
	  refund_channel_0: 'ORIGINAL',
	  refund_count: '1',
	  refund_fee: '1',
	  refund_fee_0: '1',
	  refund_id_0: '50000007722018082106052170678',
	  refund_recv_accout_0: '支付用户的零钱',
	  refund_status_0: 'SUCCESS',
	  refund_success_time_0: '2018-08-21 17:07:33',
	  result_code: 'SUCCESS',
	  return_code: 'SUCCESS',
	  return_msg: 'OK',
	  sign: '45DFBBD2480F4BAB9C2CB14F545FFE6E',
	  total_fee: '1',
	  transaction_id: '4200000165201808217781847728' }

	
5.关闭订单

	(1)关闭已支付订单
	{ return_code: 'SUCCESS',
	  return_msg: 'OK',
	  appid: 'wx315ac5d37a858129',
	  mch_id: '1274134501',
	  sub_mch_id: '',
	  nonce_str: 'ToUYs6kEENJWDHSy',
	  sign: '86FDDF60087E456438DB13D346B45E96',
	  result_code: 'FAIL',
	  err_code: 'ORDERPAID',
	  err_code_des: 'order paid' }

	(2)关闭未支付订单
	{ return_code: 'SUCCESS',
	  return_msg: 'OK',
	  appid: 'wx315ac5d37a858129',
	  mch_id: '1274134501',
	  sub_mch_id: '',
	  nonce_str: 'JW2KzCW6L9AesWmP',
	  sign: '552D75DBBD9C90339842358F49D55CE6',
	  result_code: 'SUCCESS' }

	(3)关闭已关闭订单
	{ return_code: 'SUCCESS',
	  return_msg: 'OK',
	  appid: 'wx315ac5d37a858129',
	  mch_id: '1274134501',
	  sub_mch_id: '',
	  nonce_str: 'hhBJwt12SXBjrDIn',
	  sign: 'CFA0FF866AF90107D80C4ECBADB8FF6C',
	  result_code: 'SUCCESS' }

	(4)关闭不存在订单
	{ return_code: 'SUCCESS',
	  return_msg: 'OK',
	  appid: 'wx315ac5d37a858129',
	  mch_id: '1274134501',
	  sub_mch_id: '',
	  nonce_str: '5k38jgTwpXtRM7Xw',
	  sign: 'DB1D7CA5D952CD6B6BDD6CB85D34BACB',
	  result_code: 'SUCCESS' }

	(5)关闭已退款订单
	{ return_code: 'SUCCESS',
	  return_msg: 'OK',
	  appid: 'wx315ac5d37a858129',
	  mch_id: '1274134501',
	  sub_mch_id: '',
	  nonce_str: 'jb5sXdowOzp3StOs',
	  sign: 'F8344AD1D412983EEBAD979FAFFD437C',
	  result_code: 'FAIL',
	  err_code: 'ORDERPAID',
	  err_code_des: 'order paid' }

#
测试支付宝:
20180821386906 未支付

1.下单
	(1)下单, 没有支付 --- payStatus:2 支付失败
	(2)下单, 立即支付 --- payStatus:1 支付成功
	(3)下单, 扫了码, 在轮询结束后, 再支付 --- 订单被关闭
	
2.查询

	(1)查询已支付订单
	 { code: '10000',
	  msg: 'Success',
	  buyer_logon_id: 'www***@qq.com',
	  buyer_pay_amount: '0.00',
	  buyer_user_id: '2088502347015634',
	  invoice_amount: '0.00',
	  out_trade_no: '20180821208563',
	  point_amount: '0.00',
	  receipt_amount: '0.00',
	  send_pay_date: '2018-08-21 18:45:30',
	  total_amount: '0.01',
	  trade_no: '2018082121001004630573123999',
	  trade_status: 'TRADE_SUCCESS' }
	
	(2)查询未支付订单
	{ code: '10000',
	  msg: 'Success',
	  buyerLogonId: 'www***@qq.com',
	  buyerPayAmount: '0.00',
	  buyerUserId: '2088502347015634',
	  invoiceAmount: '0.00',
	  outTradeNo: '20180821386906',
	  pointAmount: '0.00',
	  receiptAmount: '0.00',
	  totalAmount: '0.01',
	  tradeNo: '2018082121001004630574256864',
	  tradeStatus: 'WAIT_BUYER_PAY' }

	(3)查询已关闭订单
	{ code: '10000',
	  msg: 'Success',
	  buyer_logon_id: 'www***@qq.com',
	  buyer_pay_amount: '0.00',
	  buyer_user_id: '2088502347015634',
	  invoice_amount: '0.00',
	  out_trade_no: '20180821386906',
	  point_amount: '0.00',
	  receipt_amount: '0.00',
	  total_amount: '0.01',
	  trade_no: '2018082121001004630574256864',
	  trade_status: 'TRADE_CLOSED' }
	
	(4)查询不存在订单
	{ code: '40004',
	  msg: 'Business Failed',
	  sub_code: 'ACQ.TRADE_NOT_EXIST',
	  sub_msg: '交易不存在',
	  buyer_pay_amount: '0.00',
	  invoice_amount: '0.00',
	  out_trade_no: '20180821386906123',
	  point_amount: '0.00',
	  receipt_amount: '0.00' }
	
	(5)查询已退款订单
	{ code: '10000',
	  msg: 'Success',
	  buyerLogonId: 'www***@qq.com',
	  buyerPayAmount: '0.00',
	  buyerUserId: '2088502347015634',
	  invoiceAmount: '0.00',
	  outTradeNo: '20180821959868',
	  pointAmount: '0.00',
	  receiptAmount: '0.00',
	  sendPayDate: '2018-08-21 18:13:24',
	  totalAmount: '0.01',
	  tradeNo: '2018082121001004630573662426',
	  tradeStatus: 'TRADE_CLOSED' }

	
3.退款

	(1)退款已支付订单
	{ code: '10000',
	  msg: 'Success',
	  buyer_logon_id: 'www***@qq.com',
	  buyer_user_id: '2088502347015634',
	  fund_change: 'Y',
	  gmt_refund_pay: '2018-08-21 18:21:17',
	  out_trade_no: '20180821959868',
	  refund_fee: '0.01',
	  send_back_fee: '0.00',
	  trade_no: '2018082121001004630573662426' }

	(2)退款未支付订单
	{ code: '40004',
	  msg: 'Business Failed',
	  sub_code: 'ACQ.TRADE_STATUS_ERROR',
	  sub_msg: '交易状态不合法',
	  refund_fee: '0.00',
	  send_back_fee: '0.00' }

	(3)退款已关闭订单
	{ code: '40004',
	  msg: 'Business Failed',
	  sub_code: 'ACQ.TRADE_HAS_CLOSE',
	  sub_msg: '交易已经关闭',
	  refund_fee: '0.00',
	  send_back_fee: '0.00' }

	(4)退款不存在订单
	{ code: '40004',
	  msg: 'Business Failed',
	  sub_code: 'ACQ.TRADE_NOT_EXIST',
	  sub_msg: '交易不存在',
	  refund_fee: '0.00',
	  send_back_fee: '0.00' }
	
	(5)退款已退款订单
	{ code: '10000',
	  msg: 'Success',
	  buyer_logon_id: 'www***@qq.com',
	  buyer_user_id: '2088502347015634',
	  fund_change: 'N',
	  gmt_refund_pay: '2018-08-21 18:21:17',
	  out_trade_no: '20180821959868',
	  refund_fee: '0.01',
	  send_back_fee: '0.00',
	  trade_no: '2018082121001004630573662426' }
	  

4.退款查询

	(1)退款查询已支付订单
	{ code: '10000', msg: 'Success' }
	
	(2)退款查询未支付订单
	{ code: '10000', msg: 'Success' }

	(3)退款查询已关闭订单
	{ code: '10000', msg: 'Success' }

	(4)退款查询不存在订单
	{ code: '40004',
	  msg: 'Business Failed',
	  sub_code: 'ACQ.TRADE_NOT_EXIST',
	  sub_msg: '交易不存在',
	  out_trade_no: '20180821386906123' }

	(5)退款查询已退款订单
	{ code: '10000', msg: 'Success' }

	
5.关闭订单

	(1)关闭已支付订单
	{ code: '40004',
	  msg: 'Business Failed',
	  sub_code: 'ACQ.TRADE_STATUS_ERROR',
	  sub_msg: '交易状态不合法',
	  out_trade_no: '20180821208563' }

	(2)关闭未支付订单
	{ code: '10000',
	  msg: 'Success',
	  out_trade_no: '20180821386906',
	  trade_no: '2018082121001004630574256864' }

	(3)关闭已关闭订单
	{ code: '40004',
	  msg: 'Business Failed',
	  sub_code: 'ACQ.TRADE_STATUS_ERROR',
	  sub_msg: '交易状态不合法',
	  out_trade_no: '20180821386906' }

	(4)关闭不存在订单
	{ code: '40004',
	  msg: 'Business Failed',
	  sub_code: 'ACQ.TRADE_NOT_EXIST',
	  sub_msg: '交易不存在' }

	(5)关闭已退款订单
	{ code: '40004',
	  msg: 'Business Failed',
	  sub_code: 'ACQ.TRADE_STATUS_ERROR',
	  sub_msg: '交易状态不合法',
	  out_trade_no: '20180821959868' }


# 20180820
1.统一下单
http://localhost:9009/auth/pay/wx2.0


# 20180816
1.在db.js中加入logger, 记录日志情况(可以模仿alipay.js中的日志写法)
所有try{}catch(){}的路由中的err, 都需要添加错误日志记录.

2.微信支付Wxpay, 创建WxpayFactory类
(1)设置默认配置参数.
(2)定义createWxpaySdk()方法, 其中封装WxpaySdk实例
const WxpaySdk = require('../lib/twx')
(3)微信支付, 只有异步返回.
(4)微信支付, 在创建二维码的时候, 就会生成订单.
   而支付宝, 在显示二维码的时候, 不会生成订单.
   需要扫描二维码, 才会生成订单, 这是微信支付和支付宝的区别
3.测试流程:
第一阶段:
(1)向http://localhost:9009/auth/pay/wx发起post请求
(2)post请求, 附带参数total_fee, body
(3)观察数据库是否保存, pay schema --- p1 --- 测试成功
   db.pays.find()
(4)观察二维码url是否返回 --- p2 --- 测试成功
(5)使用二维码url, 通过网页工具生成二维码扫描. --- 测试成功

第二阶段:
微信支付, 只传递参数notify_url
(1)下单后, 开始轮询.
(2)观察delay通知. --- p3 --- 测试成功
(3)等待5秒后, 观察promotion通知, 事件delay>>>promotion(inactive) --- p4 --- 测试成功
(4)等待1秒后, 程序扫描到inactive集合中的id, 执行queryOrder方法 --- 测试成功
(5)将该id任务, 事件从inactive>>>active, --- 观察active通知 ---p5 --- 测试成功
(6)观察process返回的job实例. --- p6 --- 测试成功
(7)发起查询
(8)观察exports.queryOrder的参数接收情况, --- p7 --- 测试成功
	type
	outTradeNo
	maxAttempts
	attempts
(9)exports._alipayQuery发起查询, 观察返回结果 --- p8 --- 测试成功, 显示NOTPAY
	观察tradeStatus --- p9 --- 测试
(10)以下分为2中情况:
	第一种成功:
	第二种失败:
	第三种扫码, 生成订单, 但不支付.
(11)轮询 >>> doComplete和doFinish中微信支付, 修改订单没有写. --- 已经补上了.

成功: 
(15)成功 --- 观察complete通知 --- p10 --- 测试
(16)doComplete --- 观察获取到q:jobs:complete下的id, 对应信息, type + out_trade_no --- p11 --- 测试
(17)保存到数据库 --- 观察数据库变化 --- p12 --- 测试
(18)观察'do Complete'通知 --- p13 --- 测试
(18.2)观察'save'通知 --- p14 --- 测试

失败:
(19.1)如果是任务job超时, 观察到TTL exceed通知 --- p15 --- 测试成功
(19)观察failed通知 --- p16 --- 测试成功
(20)如果有尝试次数 --- 观察retry通知. --- 并开始下一轮循环. --- p17 --- 测试成功
(21)如果没有尝试次数 --- 观察finish通知. --- p18 --- 测试成功
(22)doFinish() --- 观察获取到q:jobs:finish下的id, 对应信息, type + out_trade_no --- p19 --- 测试成功
(23)观察'do finish'通知 --- p20 --- 测试成功
(24)观察'save'通知 --- p21 --- 测试成功
	删除q:jobs:complete和q:jobs:finish中对应id的记录.
	
未支付:
(25)观察微信支付查询订单, 返回结果ret. --- p22 --- 测试成功
(26)观察tradeStatus --- p23 --- 测试成功
(27)观察failed通知 --- 测试成功
(28)观察finish通知 --- 测试成功
(29)doFinish(), 获取type + out_trade_no参数 --- 测试成功
(30)观察'doFinish'通知 --- 测试成功
(31)观察'save'通知 --- 测试成功


(32)如果是'CLOSE', 流程上会有问题吗?


# 20180815 --- 基本完成
1.在db.js中加入logger, 记录日志情况(可以模仿alipay.js中的日志写法)

所有try{}catch(){}的路由中的err, 都需要添加错误日志记录.

2.支付宝新接口(PC电脑网站支付)已经完成.
3.如何测试???
(1)拟定订单状态为3个
	0 >>> 未支付
	1 >>> 支付成功
	2 >>> 支付失败
4.测试流程:
第一阶段:
(1)向http://localhost:9009/auth/alipay/pay2.0发起get请求.
(2)get请求, 附带参数totalAmount, subject, body
例如: url=http://localhost:9009/auth/alipay/pay2.0?totalAmount=0.01&subject=商品名称&body=商品描述
注意: url中的参数不带'', 例如: totalAmount='0.01' >>> 错误写法, 引起请求失败.
(3)观察数据库是否保存? --- 成功
	a.数据库alipay, 添加app_id字段, 保存用于异步验证.
	b.数据库alipay, 添加body字段, 表示商品描述.
(4)观察支付宝收银台是否被调起?, 即支付请求是否成功 --- 成功

第二阶段: 异步接收
测试时, 暂时不传return_url, 只传notify_url.
(1)PCAlipayFormUrlNotify路由, 支付成功后, 支付宝会向/auth/zfb/callback/notify发送post请求.
(2)post请求, 附带支付成功返回的postData数据.
注意: 只有当支付成功时, 即返回的postData中的trade_status==='TRADE_SUCCESS'时, 支付宝才会发送post请求.
当trade_status为其他状态时, 不会触发通知.
(3)观察postData是否正确. --- 有数据返回, 类型为object
(4)观察验签结果. --- true
(5)观察数据比对结果.(totalAmount, appId, outTradeNo) --- true
(6)观察trade_status状态值, 是否为'TRADE_SUCCESS' --- TRADE_SUCCESS
(7)观察更新订单状态 ---true
(8)查看数据库数据是否更新

第三阶段: 同步接收
测试时, 暂时不传notify_url, 只传return_url.
(1)PCAlipayTradePagePay路由, 支付成功后, 支付宝会向/auth/zfb/callback/return发送get请求.
(2)get请求, 附带支付成功返回的url数据. 
(3)url数据通过ctx.request.query来解析获取out_trade_no
(4)观察out_trade_no --- 测试 成功
(5)开始轮询
(6)观察delay通知 --- 测试 成功
(7)等待5秒后, delay>>>inactive, 观察promotion(inactive)通知 --- 测试 成功
(8)等待1秒后, 程序扫描到inactive集合中的id, 执行queryOrder方法.
(9)将该id的任务, 从事件由inactive>>>active , 观察active通知. --- 测试 成功
(10)观察process()后返回的job实例 --- p1 --- 测试成功
(11)发起查询
(12)观察exports.queryOrder的参数接收情况, --- p2 --- 测试 成功
	type
	outTradeNo
	maxAttempts
	attempts
(13)exports._alipayQuery发起查询, 观察返回结果 --- p3 --- 测试 成功
	观察tradeStatus --- p4 --- 测试 成功
(14)以下分为2中情况:
	第一种成功:
	第二种失败:
	第三种扫码, 生成订单, 但不支付.
	
成功:	
(15)成功 --- 观察complete通知 --- p5 --- 测试成功
(16)doComplete --- 观察获取到q:jobs:complete下的id, 对应信息, type + out_trade_no --- p6 --- 测试 成功
(17)保存到数据库 --- 观察数据库变化 --- p7 --- 测试成功
(18)观察'do Complete'通知 --- p8 --- 测试成功
(18.2)观察'save'通知 --- 测试成功
	
失败:
(19.1)如果是任务job超时, 观察到TTL exceed通知 --- 测试 成功
(19)观察failed通知 --- 测试 成功
(20)如果有尝试次数 --- 观察retry通知. --- 并开始下一轮循环. --- p9 --- 测试成功
(21)如果没有尝试次数 --- 观察finish通知. --- p10 --- 测试 成功
(22)doFinish() --- 观察获取到q:jobs:finish下的id, 对应信息, type + out_trade_no --- p11 --- 测试成功
(23)观察'do finish'通知 --- p12 --- 测试成功
(24)观察'save'通知 --- p13 --- 测试成功
	删除q:jobs:complete和q:jobs:finish中对应id的记录.
	
	
思考:
(1)要满足delay需求, 所以在q:jobs:delay中, 添加(到期时间, zid): checkPromotion: delay>>>promotion(inactive)
(2)要满足active ttl过期需求, 所以要在q:jobs:active中, 添加(过期时间, zid): checkActiveTTL: active>>>failed
(3)chekActive(): inactive>>>active

第四阶段: 异步/同步同时接收


# 20180811 - 20180812

准备: 先跑通环境(路由) --- 完成

1.在提交alipay.trade.page.pay表单时, 保存一份到数据库. --- 完成
(1)用于在支付宝异步返回时, 检查数据的有效性 
(2)异步返回必须, 先验证签名, 再检查数据有效性

2.更新异步返回路由 --- 完成 (路由模拟测试) --- 完成
(1) 对参数进行验签(数据已经有了, 使用固定数据来模拟, 实现验签)
(2) 对totalAmount, out_trade_no, app_id进行比对(异步通知和数据库中的请求是否一致)
(3) 对trade_status进行后续 业务处理

3.更新同步返回路由 --- 完成
(1) 返回的是一个url, 包括参数: total_amount, timestamp, sign, sign_type, auth_app_id, charset, seller_id, method, app_id, out_trade_no, version
(2) 发现其中并没有交易状态(trade_status), 所以支付是否成功, 不能依赖同步返回.
(3) 决定: 不对同步返回做验签, 直接获取out_trade_no, 开启轮询.
	a. 获取到out_trade_no, 说明用户已经支付了, 才会有同步回调
	
3.1轮询修改 --- 
(1) 轮询成功 >>> 标记为complete >>> 调起q:jobs:complete轮询 >>> 保存到数据库(支付成功)
(2) 轮询失败 >>> 标记为failed >>> 调起重试轮询 >>> 有剩余尝试次数 >>> 进入下一次轮询
										   >>> 没有剩余尝试次数 >>> 标记为finish >>> 调起q:jobs:finish轮询 >>> 保存到数据库(支付失败)
	注意: 轮询失败包括
	a.未得到支付成功状态TRADE_SUCCESS/TRADE_FINISH
	b.任务超时
(3) 轮询失败状态确定后, 发起撤销订单接口. 修改原来的订单撤销接口.
(4) 数据库保存: 针对q:jobs:complete和q:jobs:finish, 两者保存时，都有支付宝和微信支付， 2种方式， 
	所以， 在保存时， 针对支付宝， 已经有了AlipayFactory支付宝工厂类， 相对的， 也需要添加一个WxpayFactory微信支付工厂类
	功能: 添加微信支付工厂类WxpayFactory, 先在原来的基础上封装一个能用的就行.
	在完成支付整体项目后， 在有空的时候， 将微信支付按支付宝sdk那样修改.
	
4.编写PC电脑网站支付的查询接口, 并测试(在公司完成) --- 完成， 已测试
(1) 原因: 在轮询中, 需要使用.

5.编写PC电脑网站支付的撤销订单接口, 并测试(在公司完成) --- 完成， 已测试
(1) 原因: 同上.

6.编写剩下接口, 完成对应的独立功能路由. --- 完成，已测试


7.package.js不要　把AlipayForm放到AlipaySdkFactory中去，　然后将AlipaySdkFactory改为AlipayFactory. --- 完成

module.exports = new AlipayFactory()

使用: const alipayFactory = require('./factory')


8.在db.js中加入logger, 记录日志情况(可以模仿alipay.js中的日志写法)

所有try{}catch(){}的路由中的err, 都需要添加错误日志记录.


9.对轮询请求这一块， 做重新定义， 重新开一个类
参数
(1)job实例，由id获取
(2)queue实例
(3)type: alipay/wxpay
(4)暂时搁置， 先把功能完成， 再想着去优化写法和函数.

10.问题: 轮询， 结果保存的是alipay支付宝的， 那么微信支付的怎么办???


# 20180814

1.在job.js中新添加getJobProcess()方法, 用来替代getJobInfo()方法 --- 修改 --- 测试成功
(1)方法已经写完, 如何测试? 
(2)直接调用queue.createQueue('alipay', {out_trade_no:'12345798798'})
	.delay()
	.backoff()
	.ttl()
	.attempts()
	.save()
即可
(3)修改Queue的setupTimer()中的queryOrder(), 将getJobInfo()修改为getJobProcess()
(4)观察q:jobs:inactive是否更新为q:jobs:active --- 测试成功


2.在db.js中加入logger, 记录日志情况(可以模仿alipay.js中的日志写法)

所有try{}catch(){}的路由中的err, 都需要添加错误日志记录.

3.对轮询请求这一块, 做重新定义, 现有参数为out_trade_no和type
(1)统一为loopParams={out_trade_no:'', type:''}作为传参
(2)不能在queryOrder轮询时, 采用 new 来创建一个实例, 这样每次轮询都会产生多个实例, 这显然是不合理的.
(3)尝试使用exports.xxx = function(){}, 只要引入就可以使用.

4.return new Promise((resolve, reject) => {
	// ...
	// 返回一个Promise盒子, 表示盒子中是一个异步操作
	// 调用: 调用Promise盒子, 需要使用await
	// 接收一个...then()
	// 例如: config.urllib.request({
			// ...
		}).then(ret => {
			resolve(ret) / reject(ret)
		})
}) 

funName()