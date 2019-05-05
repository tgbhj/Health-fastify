/**
 * AlipayDB --- 支付宝涉及到数据库操作
 * 1.引入数据库已经有的模块
 * */
const alipay = require('../../../dbs/alipay');
const snakeCaseKeys = require('snakecase-keys');
const _ = require('underscore');
const hhluser = require('../../../dbs/hhlusers');

class AlipayDb {
    constructor(config) {
        this.config = config;
        this.appId = config.appId
    }

    /***
     * PC电脑网站支付时, 保存订单信息
     * @param outTradeNo
     * @param query
     * @returns {Promise.<boolean>}
     */
    async save(outTradeNo, query) {
        try {
            const saveParams = {
                user_id: query.user_id,
                outTradeNo,
                appId: this.appId,
                totalAmount: query.totalAmount,
                subject: query.subject,
                body: query.body
            };
            let decamelizeParams = snakeCaseKeys(saveParams); // 驼峰转成下划线
            console.log('[decamelizeParams]', decamelizeParams);
            await alipay.create(decamelizeParams);
            return true
        } catch (err) {
            return false
        }
    }

    /***
     * 比对异步返回数据(totalAmount, appId, out_trade_no)
     * @param postData
     * @returns {Promise.<boolean>}
     */
    static async checkNotifyData(postData) {
        try {
            const {out_trade_no, total_amount, app_id} = postData;
            const checkParams = {
                out_trade_no,
                total_amount,
                app_id
            };
            let builder = alipay.find(checkParams);
            let findRes = await builder.exec();
            let checkRes = false;
            findRes.length > 0 && (checkRes = true);
            return checkRes
        } catch (err) {
            return false
        }
    }

    /***
     * 更新订单信息
     * @param postData {Object}
     * @param updateArr
     * @param conditionArr
     * @param status {Number} 0:订单未支付 1:支付成功 2:支付失败
     * @returns {Promise.<boolean>}
     */
    static async upDateOrderStatus(postData, updateArr, conditionArr, status) {
        try {
            postData = snakeCaseKeys(postData);
            let updateParams = _.pick(postData, updateArr);
            let conditionParams = _.pick(postData, conditionArr);
            updateParams = Object.assign(updateParams, status);
            // const {out_trade_no, total_amount, app_id} = postData
            await alipay.findOneAndUpdate(
                conditionParams, // 查询条件
                {$set: updateParams}, // 更新的数据
                {new: true} // mongodb将返回修改后的值
            ).exec();
            return true
        } catch (err) {
            return false
        }
    }

    /***
     * 更新订单信息(轮询用)
     * @param outTradeNo
     * @param status
     * @returns {Promise.<boolean>}
     */
    static async updateOrderStatusByLoop(outTradeNo, status) {
        try {
            const updateParams = {outTradeNo};
            const decamelizeParams = snakeCaseKeys(updateParams);
            await alipay.findOneAndUpdate(
                decamelizeParams,
                {$set: {payStatus: status}},
                {new: true}
            ).exec((err, cb) => {
                if (cb.body === '积分充值') {
                    hhluser
                        .findOneAndUpdate({_id: cb.user_id}, {$inc: {virtual: cb.total_amount}})
                        .exec()
                }
            });
            return true
        } catch (err) {
            return false
        }
    }
}

module.exports = AlipayDb;