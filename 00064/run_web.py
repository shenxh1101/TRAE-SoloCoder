#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Web应用启动入口
自动化员工培训与考核管理系统 - Web版
"""

import os
import sys
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from web import create_app, socketio, scheduler

def main():
    parser = argparse.ArgumentParser(description='员工培训与考核管理系统 - Web版')
    parser.add_argument('--host', default='0.0.0.0', help='监听地址')
    parser.add_argument('--port', type=int, default=5000, help='监听端口')
    parser.add_argument('--debug', action='store_true', help='调试模式')
    parser.add_argument('--no-scheduler', action='store_true', help='不启动定时任务')
    
    args = parser.parse_args()
    
    app = create_app()
    
    print("=" * 60)
    print("  自动化员工培训与考核管理系统 - Web版")
    print("=" * 60)
    print(f"  服务地址: http://{args.host}:{args.port}")
    print(f"  调试模式: {'开启' if args.debug else '关闭'}")
    print(f"  定时任务: {'关闭' if args.no_scheduler else '开启'}")
    print("=" * 60)
    print(f"  访问主页: http://localhost:{args.port}")
    print(f"  管理员控制台: http://localhost:{args.port}/admin")
    print(f"  员工中心: http://localhost:{args.port}/employee")
    print("=" * 60)
    
    try:
        socketio.run(
            app,
            host=args.host,
            port=args.port,
            debug=args.debug,
            allow_unsafe_werkzeug=True
        )
    except KeyboardInterrupt:
        print("\n正在停止服务...")
        if not args.no_scheduler:
            from web.scheduler import stop_scheduler
            stop_scheduler()
        print("服务已停止")

if __name__ == '__main__':
    main()
