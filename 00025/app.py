import os

from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    send_file,
    flash,
    jsonify,
)

from archiver import ArchiverConfig, WebArchiver, ArchiveLogger


app = Flask(__name__)
app.secret_key = "web-archiver-secret-key-change-in-production"
app.jinja_env.filters["basename"] = os.path.basename

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ARCHIVES_DIR = os.path.join(os.path.expanduser("~"), ".web_archiver", "archives")
LOG_PATH = os.path.join(os.path.expanduser("~"), ".web_archiver", "archive_log.json")

os.makedirs(ARCHIVES_DIR, exist_ok=True)

logger = ArchiveLogger(log_path=LOG_PATH)


def _build_config_from_form():
    max_depth = int(request.form.get("max_depth", 1))
    timeout = int(request.form.get("timeout", 30))
    max_file_size = int(request.form.get("max_file_size", 10)) * 1024 * 1024
    no_js = "no_js" in request.form
    user_agent = request.form.get("user_agent", "WebArchiver/1.0")
    return ArchiverConfig(
        max_depth=max_depth,
        timeout=timeout,
        max_file_size=max_file_size,
        no_js=no_js,
        user_agent=user_agent,
    )


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/archive", methods=["POST"])
def archive():
    url = request.form.get("url", "").strip()
    if not url:
        flash("请输入有效的URL", "error")
        return redirect(url_for("index"))

    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    config = _build_config_from_form()
    archiver = WebArchiver(config=config, logger=logger)
    try:
        zip_path = archiver.archive_url(url, output_dir=ARCHIVES_DIR)
        flash(f"归档成功！文件已生成：{os.path.basename(zip_path)}", "success")
    except Exception as e:
        flash(f"归档失败：{str(e)}", "error")

    return redirect(url_for("history"))


@app.route("/batch", methods=["GET", "POST"])
def batch():
    if request.method == "GET":
        return render_template("batch.html")

    txt_file = request.files.get("file")
    if not txt_file or not txt_file.filename:
        flash("请上传包含URL列表的TXT文件", "error")
        return redirect(url_for("batch"))

    content = txt_file.read().decode("utf-8", errors="ignore")
    urls = [line.strip() for line in content.splitlines() if line.strip()]

    if not urls:
        flash("文件中没有有效的URL", "error")
        return redirect(url_for("batch"))

    config = _build_config_from_form()
    archiver = WebArchiver(config=config, logger=logger)

    try:
        batch_zip_path, errors = archiver.archive_batch(urls, output_dir=ARCHIVES_DIR)
        if batch_zip_path:
            msg = f"批量归档完成！共处理 {len(urls)} 个URL"
            if errors:
                msg += f"，{len(errors)} 个失败"
            flash(msg, "success")
        else:
            flash("所有URL归档均失败", "error")
    except Exception as e:
        flash(f"批量归档出错：{str(e)}", "error")

    return redirect(url_for("history"))


@app.route("/history")
def history():
    logs = logger.get_all()
    logs.reverse()
    return render_template("history.html", logs=logs)


@app.route("/download/<path:filename>")
def download(filename):
    file_path = os.path.join(ARCHIVES_DIR, filename)
    if not os.path.exists(file_path):
        flash("文件不存在", "error")
        return redirect(url_for("history"))
    return send_file(file_path, as_attachment=True)


@app.route("/delete_log/<entry_id>", methods=["POST"])
def delete_log(entry_id):
    logger.delete_entry(entry_id)
    flash("记录已删除", "success")
    return redirect(url_for("history"))


@app.route("/clear_logs", methods=["POST"])
def clear_logs():
    logger.clear_all()
    flash("所有记录已清除", "success")
    return redirect(url_for("history"))


@app.route("/api/archive", methods=["POST"])
def api_archive():
    data = request.get_json(force=True)
    url = data.get("url", "").strip()
    if not url:
        return jsonify({"error": "URL is required"}), 400

    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    config = ArchiverConfig(
        max_depth=int(data.get("max_depth", 1)),
        timeout=int(data.get("timeout", 30)),
        max_file_size=int(data.get("max_file_size", 10)) * 1024 * 1024,
        no_js=data.get("no_js", False),
        user_agent=data.get("user_agent", "WebArchiver/1.0"),
    )

    archiver = WebArchiver(config=config, logger=logger)
    try:
        zip_path = archiver.archive_url(url, output_dir=ARCHIVES_DIR)
        return jsonify({
            "status": "success",
            "zip_file": os.path.basename(zip_path),
            "download_url": url_for("download", filename=os.path.basename(zip_path)),
        })
    except Exception as e:
        return jsonify({"status": "failed", "error": str(e)}), 500


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5001,
        debug=True,
    )
