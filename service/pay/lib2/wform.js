const isJSON = require('is-json');

class WxpayForm {
    constructor() {
        this.fields = [];
        this.files = []
    }

    getFields() {
        return this.fields
    }

    getFiles() {
        return this.files
    }

    /***
     * 增加字段(微信支付, 证书请求用)
     * @param fieldName 字段名
     * @param fieldValue 字段值
     * @returns {WxpayForm}
     */
    addField(fieldName, fieldValue) {
        if (isJSON(fieldValue)) {
            this.fields.push({name: fieldName, value: JSON.parse(fieldValue)})
        } else {
            this.fields.push({name: fieldName, value: fieldValue})
        }
        return this // 链式写法
    }

    /***
     * 增加文件
     * @param fieldName 字段名
     * @param fileName 文件名
     * @param filePath 文件绝对路径
     */
    addFiles(fieldName, fileName, filePath) {
        this.files.push({
            fieldName,
            name: fileName,
            path: filePath
        })
    }
}

module.exports = WxpayForm;