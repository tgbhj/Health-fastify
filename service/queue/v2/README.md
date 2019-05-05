lib/xqueue.js>>>this.setupTimers()>>>checkActive()>>>queryOrder()


            // 查询结果

            // if (type === 'alipay') {
            //   // 支付宝发起查询订单
            //   // let payload = await talipay.createQueryOrder({out_trade_no})
            //   let payload = await Pay.createQueryOrder(type, out_trade_no)
            //   tradeStatus = payload[method]['trade_status']
            // } else if (type === 'wxpay') {
            //   // 微信支付发起查询订单
            //   //let payload = await twxpay.createQueryOrder({out_trade_no})
            //   let payload = await Pay.createQueryOrder(type, out_trade_no)
            //   // 拿出返回状态码
            //   tradeStatus = payload['trade_status']
            // }
            //
            // // 查询结果
            // if (tradeStatus === 'TRADE_SUCCESS' || // 支付宝
            //   tradeStatus === 'TRADE_CLOSED' ||
            //   tradeStatus === 'SUCCESS' || // 微信支付
            //   tradeStatus === 'CLOSED'
            // ) {
            //   job.done(`${type} success`)
            // } else if (
            //   tradeStatus === 'WAIT_BUYER_PAY' || // 支付宝
            //   tradeStatus === 'NOTPAY') { // 微信支付
            //   job.done(new Error(`${type} failed`))
            // }

            // ================================= 测试用
            // 手动done()
            // & alipay --- complete
            // & wxpay --- finish
            // if (type === 'alipay') {
            //   job.done('支付成功 - pay success')
            // } else if (type === 'wxpay') {
            //   let err = '支付失败 - pay finish'
            //   let stack = '查询失败'
            //   _job.state('failed', {err, stack})
            //   if (!(parseInt(_job.max_attempts) > parseInt(_job._attempts))) { // 重试次数用完时， 撤销订单
            //     // 调用撤销订单接口
            //     // Pay.createCloseOrder(type, out_trade_no)
            //     console.log('[调用支付撤销订单接口]')
            //   }
            // }