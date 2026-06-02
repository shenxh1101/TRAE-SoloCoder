#!/usr/bin/env python3
import os
import sys
import subprocess
import tempfile
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def run_cli(inputs, env_home):
    env = os.environ.copy()
    env['HOME'] = env_home
    
    proc = subprocess.Popen(
        [sys.executable, "music_manager.py"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        cwd=os.path.dirname(os.path.abspath(__file__)),
        env=env
    )
    
    full_input = '\n'.join(inputs) + '\n'
    stdout, stderr = proc.communicate(input=full_input, timeout=30)
    
    return stdout, stderr, proc.returncode

def main():
    print("=" * 70)
    print("🎮 自动化交互测试 - music_manager.py")
    print("=" * 70)
    
    temp_home = tempfile.mkdtemp()
    test_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_music")
    m3u_export_path = os.path.join(temp_home, "test_export.m3u")
    
    errors = []
    results = []
    
    def add_test(name, success, details=""):
        status = "✅ 通过" if success else "❌ 失败"
        results.append((name, success, details))
        if not success:
            errors.append(f"{name}: {details}")
        print(f"  {status} - {name}")
        if details:
            print(f"     {details}")
    
    try:
        print("\n📋 第一轮测试: 创建播放列表和添加歌曲")
        print("-" * 70)
        
        song1_path = os.path.join(test_dir, "Bohemian Rhapsody.mp3")
        song2_path = os.path.join(test_dir, "Yesterday.mp3")
        
        inputs1 = [
            "1",
            "测试播放列表",
            "",
            "5",
            song1_path,
            "摇滚",
            "激情",
            "5",
            "",
            "5",
            song2_path,
            "流行",
            "怀旧",
            "5",
            "",
            "6",
            test_dir,
            "摇滚",
            "快乐",
            "4",
            "",
            "9",
            "",
            "0",
        ]
        
        stdout1, stderr1, code1 = run_cli(inputs1, temp_home)
        
        print("输出预览:")
        print(stdout1[-2000:] if len(stdout1) > 2000 else stdout1)
        if stderr1:
            print(f"STDERR: {stderr1}")
        
        add_test("程序启动运行", code1 == 0, f"退出码: {code1}")
        add_test("创建播放列表", "播放列表 '测试播放列表' 创建成功" in stdout1)
        add_test("添加单首歌曲", "歌曲 'Bohemian Rhapsody' 已添加到播放列表" in stdout1)
        add_test("批量添加音乐", "成功添加" in stdout1 or "找到" in stdout1)
        add_test("显示歌曲列表", "歌曲列表" in stdout1)
        
        print("\n📋 第二轮测试: 播放、推荐、统计、M3U")
        print("-" * 70)
        
        inputs2 = [
            "9",
            "",
            "10",
            "1",
            "",
            "13",
            "",
            "14",
            "1",
            "",
            "18",
            "",
            "16",
            m3u_export_path,
            "",
            "8",
            "1",
            "电子",
            "亢奋",
            "5",
            "",
            "0",
        ]
        
        stdout2, stderr2, code2 = run_cli(inputs2, temp_home)
        
        print("输出预览:")
        print(stdout2[-3000:] if len(stdout2) > 3000 else stdout2)
        if stderr2:
            print(f"STDERR: {stderr2}")
        
        add_test("程序第二轮启动", code2 == 0)
        add_test("交互式选择播放", "正在播放" in stdout2)
        add_test("切换播放模式", "播放模式已设置为" in stdout2)
        add_test("智能推荐", "推荐歌曲" in stdout2 or "基于" in stdout2 or "相似度" in stdout2)
        add_test("统计柱状图", "流派分布" in stdout2 and "心情分布" in stdout2 and "█" in stdout2)
        add_test("M3U导出", "播放列表已导出到" in stdout2)
        add_test("M3U文件存在", os.path.exists(m3u_export_path))
        
        if os.path.exists(m3u_export_path):
            with open(m3u_export_path, 'r') as f:
                m3u_content = f.read()
            add_test("M3U包含标签信息", "#EXTGENRE" in m3u_content and "#EXTMOOD" in m3u_content and "#EXTRATING" in m3u_content)
        else:
            add_test("M3U包含标签信息", False, "M3U文件不存在")
        
        add_test("编辑歌曲信息", "歌曲信息已更新" in stdout2)
        
        print("\n📋 第三轮测试: M3U导入、切换播放列表")
        print("-" * 70)
        
        inputs3 = [
            "1",
            "第二播放列表",
            "",
            "17",
            m3u_export_path,
            "",
            "4",
            "",
            "2",
            "2",
            "",
            "9",
            "",
            "0",
        ]
        
        stdout3, stderr3, code3 = run_cli(inputs3, temp_home)
        
        print("输出预览:")
        print(stdout3[-2000:] if len(stdout3) > 2000 else stdout3)
        if stderr3:
            print(f"STDERR: {stderr3}")
        
        add_test("程序第三轮启动", code3 == 0)
        add_test("M3U导入", "成功导入" in stdout3)
        add_test("创建第二个播放列表", "播放列表 '第二播放列表' 创建成功" in stdout3)
        add_test("显示所有播放列表", "测试播放列表" in stdout3 and "第二播放列表" in stdout3)
        add_test("切换播放列表", "已切换到播放列表" in stdout3)
        
        print("\n📋 第四轮测试: 调用系统播放器播放")
        print("-" * 70)
        
        inputs4 = [
            "11",
            "",
            "12",
            "",
            "7",
            "1",
            "y",
            "",
            "3",
            "2",
            "y",
            "",
            "0",
        ]
        
        stdout4, stderr4, code4 = run_cli(inputs4, temp_home)
        
        print("输出预览:")
        print(stdout4[-2000:] if len(stdout4) > 2000 else stdout4)
        if stderr4:
            print(f"STDERR: {stderr4}")
        
        add_test("程序第四轮启动", code4 == 0)
        add_test("播放整个播放列表", "开始播放" in stdout4)
        add_test("下一首", "下一首" in stdout4)
        add_test("删除歌曲", "歌曲已删除" in stdout4)
        add_test("删除播放列表", "播放列表已删除" in stdout4)
        
    except subprocess.TimeoutExpired as e:
        add_test("程序超时", False, str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        add_test("异常错误", False, str(e))
    
    print("\n" + "=" * 70)
    print("📊 测试总结")
    print("=" * 70)
    
    passed = sum(1 for _, s, _ in results if s)
    total = len(results)
    
    for name, success, details in results:
        status = "✅" if success else "❌"
        print(f"  {status} {name}")
    
    print(f"\n总计: {passed}/{total} 测试通过")
    
    if errors:
        print("\n❌ 发现的错误:")
        for error in errors:
            print(f"  - {error}")
    
    if passed == total:
        print("\n🎉 所有交互测试全部通过!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} 个测试失败")
        return 1

if __name__ == "__main__":
    sys.exit(main())
