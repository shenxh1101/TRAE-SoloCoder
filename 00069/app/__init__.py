from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__, 
                static_folder='../static',
                template_folder='../templates')
    CORS(app)
    app.config['JSON_AS_ASCII'] = False
    return app
