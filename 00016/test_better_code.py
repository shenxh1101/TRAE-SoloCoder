def shorter_function():
    result = 0
    for i in range(10):
        if i <= 0 or i >= 5 or i % 2 != 0:
            continue
        for j in range(5):
            if j > 0 and j < 3:
                result += i * j
    _helper()
    return result

def _helper():
    a = 1
    b = 2
    c = a + b
    d = c * 2
    e = d - 1
    print(e)

def another_function():
    return 0

def get_email_from_data(data):
    if not data or 'users' not in data or not data['users']:
        return None
    
    for user in data['users']:
        if not user.get('active') or 'profile' not in user:
            continue
        
        profile = user['profile']
        email = profile.get('email', '')
        
        if email and '@' in email and email.endswith('.com'):
            return email
    return None
