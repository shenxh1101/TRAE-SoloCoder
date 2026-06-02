# TODO: 重构这个垃圾代码
# FIXME: 这个文件太烂了
# XXX: 谁写的？出来挨打
# BUG: 太多了，数不过来
# HACK: 临时修复，以后再说

def very_long_function():
    # 这是一个超级长的函数
    result = 0
    for i in range(10):
        if i > 0:
            if i < 5:
                if i % 2 == 0:
                    if True:
                        if False:
                            pass
                        else:
                            for j in range(5):
                                if j > 0:
                                    if j < 3:
                                        result += i * j
    # 重复代码块1
    a = 1
    b = 2
    c = a + b
    d = c * 2
    e = d - 1
    print(e)
    # 重复代码块1
    a = 1
    b = 2
    c = a + b
    d = c * 2
    e = d - 1
    print(e)
    # 重复代码块1
    a = 1
    b = 2
    c = a + b
    d = c * 2
    e = d - 1
    print(e)
    return result

def another_long_function():
    # TODO: 拆分这个函数
    # TODO: 重命名变量
    # TODO: 添加注释
    # TODO: 优化性能
    # TODO: 写单元测试
    # TODO: 清理死代码
    x = 0
    y = 0
    z = 0
    w = 0
    v = 0
    u = 0
    t = 0
    s = 0
    r = 0
    q = 0
    p = 0
    o = 0
    n = 0
    m = 0
    l = 0
    k = 0
    j = 0
    i = 0
    h = 0
    g = 0
    f = 0
    e = 0
    d = 0
    c = 0
    b = 0
    a = 0
    return x + y + z + w + v + u + t + s + r + q + p + o + n + m + l + k + j + i + h + g + f + e + d + c + b + a

def deep_nesting_example(data):
    # 这是一个嵌套很深的函数
    if data:
        if 'users' in data:
            if data['users']:
                for user in data['users']:
                    if 'active' in user and user['active']:
                        if 'profile' in user:
                            profile = user['profile']
                            if 'email' in profile:
                                if profile['email']:
                                    if '@' in profile['email']:
                                        if profile['email'].endswith('.com'):
                                            return profile['email']
    return None

def duplicate_code_hell():
    # 复制粘贴是最快的
    for i in range(10):
        if i == 0:
            print("Zero")
            print("Zero")
            print("Zero")
            print("Zero")
            print("Zero")
        elif i == 1:
            print("One")
            print("One")
            print("One")
            print("One")
            print("One")
        elif i == 2:
            print("Two")
            print("Two")
            print("Two")
            print("Two")
            print("Two")
    return None
