const isJSON = require('is-json'); // 检查是不是一个有效的JSON字符串
class AlipayForm {
    constructor() {
        this.fields = [];
        this.files = [];
        this.method = 'post'
    }

    getFields() {
        return this.fields
    }

    getFiles() {
        return this.files
    }

    getMethod() {
        return this.method
    }

    /**
     * 设置method ???
     * post、get的区别在于post会返回 form 表单，get 返回 url
     * @param method
     */
    setMethod(method) {
        this.method = method
    }

    /**
     * 增加字段
     * @param fieldName {String} 字段名
     * @param fieldValue {String} 字段值
     */
    addField(fieldName, fieldValue) {
        if (isJSON(fieldValue)) {
            // 当fieldValue为JSON字符串时，解析出json
            this.fields.push({
                name: fieldName, value: JSON.parse(fieldValue)
            })
        } else {
            this.fields.push({name: fieldName, value: fieldValue})
        }
        return this // 链式写法
    }

    /**
     * 增加文件
     * @param fieldName {String} 字段名
     * @param fileName {String} 文件名
     * @param filePath {String} 文件绝对路径
     */
    addFile(fieldName, fileName, filePath) {
        this.files.push({
            fieldName,
            name: fileName,
            path: filePath
        })
    }
}

module.exports = AlipayForm;