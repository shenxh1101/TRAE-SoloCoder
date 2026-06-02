import os
import time
from flask import Flask, send_from_directory, Response

app = Flask(__name__, static_folder=None)

TEST_SITE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_site")


@app.route("/")
def index():
    return send_from_directory(TEST_SITE_DIR, "index.html")


@app.route("/nested/<path:filename>")
def nested(filename):
    return send_from_directory(os.path.join(TEST_SITE_DIR, "nested"), filename)


@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory(os.path.join(TEST_SITE_DIR, "static"), filename)


@app.route("/slow")
def slow_response():
    delay = float(request.args.get("delay", "10"))
    time.sleep(delay)
    return f"<html><body><h1>Slow response after {delay}s</h1></body></html>"


@app.route("/large")
def large_file():
    size_mb = int(request.args.get("size", "5"))
    data = b"X" * (size_mb * 1024 * 1024)
    return Response(
        data,
        headers={
            "Content-Type": "application/octet-stream",
            "Content-Disposition": 'attachment; filename="large.bin"',
        },
    )


@app.route("/page_with_large_resource.html")
def page_with_large_resource():
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Page with large resource</title>
        <link rel="stylesheet" href="static/css/style.css">
    </head>
    <body>
        <h1>Page with large resource</h1>
        <img src="static/large_file.bin" alt="large file">
        <img src="static/images/small.png" alt="small image">
    </body>
    </html>
    """


@app.route("/page_with_slow_resource.html")
def page_with_slow_resource():
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Page with slow resource</title>
        <link rel="stylesheet" href="static/css/style.css">
    </head>
    <body>
        <h1>Page with slow resource</h1>
        <img src="slow?delay=5" alt="slow image">
        <img src="static/images/small.png" alt="small image">
    </body>
    </html>
    """


@app.route("/batch1.html")
def batch1():
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Batch Test Page 1</title>
        <link rel="stylesheet" href="static/css/style.css">
    </head>
    <body>
        <h1>📦 Batch Test Page 1</h1>
        <div class="test-box">
            <p>This is the first page for batch archiving test.</p>
            <img src="static/images/relative.png" alt="test">
        </div>
    </body>
    </html>
    """


@app.route("/batch2.html")
def batch2():
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Batch Test Page 2</title>
        <link rel="stylesheet" href="static/css/style.css">
    </head>
    <body>
        <h1>📦 Batch Test Page 2</h1>
        <div class="test-box">
            <p>This is the second page for batch archiving test.</p>
            <img src="static/images/absolute.png" alt="test">
        </div>
    </body>
    </html>
    """


@app.route("/batch3.html")
def batch3():
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Batch Test Page 3</title>
        <link rel="stylesheet" href="static/css/style.css">
    </head>
    <body>
        <h1>📦 Batch Test Page 3</h1>
        <div class="test-box">
            <p>This is the third page for batch archiving test.</p>
            <img src="static/images/protocol.png" alt="test">
        </div>
    </body>
    </html>
    """


if __name__ == "__main__":
    from flask import request
    app.run(host="127.0.0.1", port=5002, debug=False)
