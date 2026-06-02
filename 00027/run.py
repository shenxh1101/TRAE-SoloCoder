from app import app
import os

if __name__ == '__main__':
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'True').lower() == 'true'
    
    print(f"配置文件转换服务启动中...")
    print(f"服务地址: http://{host}:{port}")
    print(f"API文档:")
    print(f"  GET  /api/formats          - 获取支持的格式列表")
    print(f"  GET  /api/conversion-matrix - 获取转换矩阵")
    print(f"  POST /api/convert          - 单文件转换")
    print(f"  POST /api/batch-convert    - 批量转换(ZIP)")
    print(f"  POST /api/validate         - 语法校验")
    print(f"  POST /api/validate-script  - 脚本校验")
    print(f"  GET  /api/mapping-functions - 获取可用映射函数")
    print(f"  GET  /api/templates        - 模板列表")
    print(f"  POST /api/templates        - 创建模板")
    print(f"  GET  /api/templates/<id>   - 获取模板")
    print(f"  PUT  /api/templates/<id>   - 更新模板")
    print(f"  DELETE /api/templates/<id> - 删除模板")
    print(f"  GET  /api/download/<id>    - 下载文件")
    print(f"  GET  /api/health           - 健康检查")
    
    app.run(host=host, port=port, debug=debug)
