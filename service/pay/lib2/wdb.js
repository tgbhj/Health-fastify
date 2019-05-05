/**
 * WxpayDB --- 微信支付涉及到数据库操作
 * 1.引入数据库已有模块
 * */

const wxpay = require('../../../dbs/wxpay');
const camelCaseKeys = require('camelcase-keys');
const snakeCaseKeys = require('snakecase-keys');
const _ = require('underscore');
const mongoose = require('mongoose');
const hhluser = require('../../../dbs/hhlusers');

class WxpayDb {
    constructor(config) {
        this.config = config;
        this.tradeType = config.tradeType
    }

    async save(outTradeNo, query) {
        try {
            const saveParams = {
                user_id: query.user_id,
                outTradeNo,
                body: query.body,
                totalFee: parseInt(query.totalFee),
                outRefundNo: outTradeNo, // 商戶订单号=商户退款单号
                tradeType: this.tradeType
            };
            const decamelizeParams = snakeCaseKeys(saveParams); // 驼峰转成下划线
            await wxpay.create(decamelizeParams);
            return true
        } catch (err) {
            return false
        }
    }

    /***
     * 比对异步返回数据(out_trade_no, total_fee)
     * @param postData
     * @returns {Promise<boolean>}
     */
    static async checkNotifyData(postData) {
        try {
            const {out_trade_no, total_fee} = postData;
            const checkParams = {
                out_trade_no,
                total_fee
            };
            let builder = mongoose.find(checkParams);
            let findRes = await builder.exec();
            let checkRes = false;
            findRes.length > 0 && (checkRes = true);
            return checkRes
        } catch (err) {
            return false
        }
    }

    /***
     * 更新支付状态
     * 1.支付成功 --- 异步通知返回
     * 2.退款成功 --- 申请退款
     */
    static async upDateOrderStatus(postData, updateArr, conditionArr, status) {
        try {
            postData = snakeCaseKeys(postData);
            console.log('[postData]', postData);
            let conditionParams = _.pick(postData, conditionArr); // 条件数据
            let updateParams = _.pick(postData, updateArr); // 更新数据
            updateParams = Object.assign(updateParams, status);
            console.log('[updateParams]', updateParams);
            console.log('[conditionParams]', conditionParams);
            await wxpay.findOneAndUpdate(
                conditionParams,
                {$set: updateParams},
                {new: true}
            ).exec();
            return true
        } catch (err) {
            return false
        }
    }

    /***
     * 轮询更新支付状态
     * @param outTradeNo
     * @param status 0:未知付 1:支付成功 2:支付失败
     * @returns {Promise<boolean>}
     */
    static async updateOrderStatusByLoop(outTradeNo, status) {
        try {
            const updateParams = {outTradeNo};
            const decamelizeParams = snakeCaseKeys(updateParams);
            await wxpay.findOneAndUpdate(
                decamelizeParams,
                {$set: {payStatus: status}},
                {new: true}
            ).exec((err, cb) => {
                if (cb.body === '积分充值') {
                    hhluser
                        .findOneAndUpdate({_id: cb.user_id}, {$inc: {virtual: cb.total_fee}})
                        .exec()
                }
            });
        } catch (err) {
            return false
        }
    }
}

module.exports = WxpayDb;