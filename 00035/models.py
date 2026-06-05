import sqlite3
from datetime import datetime
from config import DB_PATH

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            doc_type TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_format TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            author_id TEXT NOT NULL,
            author_name TEXT NOT NULL,
            author_email TEXT NOT NULL,
            department TEXT NOT NULL,
            subscription_tags TEXT,
            version TEXT NOT NULL DEFAULT '1.0',
            parent_doc_id INTEGER,
            status TEXT NOT NULL DEFAULT 'pending_review',
            is_confidential BOOLEAN DEFAULT 0,
            confidential_level TEXT,
            view_count INTEGER DEFAULT 0,
            expiry_date DATETIME,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            published_at DATETIME,
            withdrawn_at DATETIME,
            FOREIGN KEY (parent_doc_id) REFERENCES documents(id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            reviewer_id TEXT NOT NULL,
            reviewer_name TEXT NOT NULL,
            reviewer_email TEXT NOT NULL,
            review_level INTEGER NOT NULL DEFAULT 1,
            status TEXT NOT NULL DEFAULT 'pending',
            assigned_at DATETIME NOT NULL,
            reviewed_at DATETIME,
            comments TEXT,
            is_escalated BOOLEAN DEFAULT 0,
            escalated_at DATETIME,
            escalation_reason TEXT,
            FOREIGN KEY (document_id) REFERENCES documents(id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS document_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            version TEXT NOT NULL,
            file_path TEXT NOT NULL,
            change_log TEXT NOT NULL,
            created_by TEXT NOT NULL,
            created_at DATETIME NOT NULL,
            FOREIGN KEY (document_id) REFERENCES documents(id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recipient_type TEXT NOT NULL,
            recipient_id TEXT NOT NULL,
            notification_type TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            document_id INTEGER,
            review_id INTEGER,
            is_read BOOLEAN DEFAULT 0,
            sent_at DATETIME NOT NULL,
            read_at DATETIME
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER,
            action TEXT NOT NULL,
            actor_id TEXT NOT NULL,
            actor_name TEXT NOT NULL,
            details TEXT,
            ip_address TEXT,
            created_at DATETIME NOT NULL
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS document_readers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            reader_id TEXT NOT NULL,
            reader_name TEXT NOT NULL,
            reader_email TEXT NOT NULL,
            read_at DATETIME NOT NULL,
            FOREIGN KEY (document_id) REFERENCES documents(id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            user_name TEXT NOT NULL,
            user_email TEXT NOT NULL,
            department TEXT NOT NULL,
            subscription_tags TEXT,
            created_at DATETIME NOT NULL,
            is_active BOOLEAN DEFAULT 1
        )
    ''')
    
    conn.commit()
    conn.close()

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
