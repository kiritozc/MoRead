import os
import sys
import webbrowser
import uuid
import shutil
import json

# 确保打包后的路径在 sys.path 中，并添加 CUDA DLLs 到 PATH
if getattr(sys, 'frozen', False):
    base_path = os.path.dirname(sys.executable)
    internal_path = os.path.join(base_path, '_internal')

    # 添加 _internal 到 sys.path
    if internal_path not in sys.path:
        sys.path.insert(0, internal_path)
    print(f"[APP] Added to sys.path: {internal_path}", flush=True)

    # 关键：添加打包的 CUDA DLLs 到 PATH（cuDNN 等）
    # cuDNN DLL 被打包到根目录（_internal）
    if internal_path not in os.environ['PATH']:
        os.environ['PATH'] = internal_path + os.pathsep + os.environ['PATH']
        print(f"[APP] Added CUDA DLLs to PATH: {internal_path}", flush=True)

from flask import Flask, render_template, request, jsonify, send_from_directory
import sys
import uuid
import shutil
import json

# 确保打包后的路径在 sys.path 中，并添加 CUDA DLLs 到 PATH
if getattr(sys, 'frozen', False):
    base_path = os.path.dirname(sys.executable)
    internal_path = os.path.join(base_path, '_internal')

    # 添加 _internal 到 sys.path
    if internal_path not in sys.path:
        sys.path.insert(0, internal_path)
    print(f"[APP] Added to sys.path: {internal_path}", flush=True)

    # 关键：添加打包的 CUDA DLLs 到 PATH（cuDNN 等）
    # cuDNN DLL 被打包到根目录（_internal）
    if internal_path not in os.environ['PATH']:
        os.environ['PATH'] = internal_path + os.pathsep + os.environ['PATH']
        print(f"[APP] Added CUDA DLLs to PATH: {internal_path}", flush=True)

from flask import Flask, render_template, request, jsonify, send_from_directory

from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder='static')
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app.config['UPLOAD_FOLDER'] = os.path.join(BASE_DIR, 'uploads')
app.config['OUTPUT_FOLDER'] = os.path.join(BASE_DIR, 'outputs')
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp', 'pdf'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload_file():
    try:
        if 'files' not in request.files:
            return jsonify({'error': 'No file part'}), 400

        file = request.files['files']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type'}), 400

        session_id = str(uuid.uuid4())
        upload_dir = os.path.join(app.config['UPLOAD_FOLDER'], session_id)
        output_dir = os.path.join(app.config['OUTPUT_FOLDER'], session_id)

        os.makedirs(upload_dir, exist_ok=True)
        os.makedirs(output_dir, exist_ok=True)

        original_filename = file.filename if file.filename else 'unknown'
        file_ext = os.path.splitext(original_filename)[1].lower() if original_filename else ''
        safe_filename = secure_filename(
            os.path.splitext(original_filename)[0]) if original_filename else 'uploaded_file'
        if not safe_filename:
            safe_filename = 'uploaded_file'
        safe_filename = safe_filename + file_ext if file_ext else safe_filename
        file_path = os.path.join(upload_dir, safe_filename)
        file.save(file_path)

        from pdf_utils import pdf_to_images

        file_ext = ''
        if '.' in safe_filename:
            file_ext = safe_filename.rsplit('.', 1)[1].lower()
        else:
            file_ext = ''
        image_paths = []

        if file_ext == 'pdf':
            image_paths = pdf_to_images(file_path, upload_dir)
        else:
            image_paths = [file_path]

        results = []

        for img_path in image_paths:
            base_name = os.path.splitext(os.path.basename(img_path))[0]

            result_img_path = os.path.join(output_dir, f"{base_name}_result.png")
            text_only_img_path = os.path.join(output_dir, f"{base_name}_text_only.png")

            from ocr_engine import process_image
            ocr_results, _ = process_image(img_path, result_img_path)

            # 生成纯文字结果图
            from ocr_engine import create_text_only_result
            import cv2
            text_only_img = create_text_only_result(img_path, ocr_results)
            cv2.imwrite(text_only_img_path, cv2.cvtColor(text_only_img, cv2.COLOR_RGB2BGR))

            original_url = f"/uploads/{session_id}/{os.path.basename(img_path)}"
            result_url = f"/outputs/{session_id}/{os.path.basename(result_img_path)}"
            text_only_url = f"/outputs/{session_id}/{os.path.basename(text_only_img_path)}"

            texts_data = [{'text': r.get('text', ''), 'box': [[int(p[0]), int(p[1])] for p in r.get('box', [])],
                           'score': float(r.get('score', 0))} for r in ocr_results]

            texts_json_path = os.path.join(output_dir, f"{base_name}_texts.json")
            with open(texts_json_path, 'w', encoding='utf-8') as f:
                json.dump(texts_data, f, ensure_ascii=False)

            results.append({
                'original': original_url,
                'result': result_url,
                'text_only': text_only_url,
                'page': base_name,
                'texts': texts_data
            })

        return jsonify({
            'session_id': session_id,
            'results': results
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/uploads/<session_id>/<filename>')
def serve_upload(session_id, filename):
    return send_from_directory(os.path.join(app.config['UPLOAD_FOLDER'], session_id), filename)


@app.route('/outputs/<session_id>/<filename>')
def serve_output(session_id, filename):
    return send_from_directory(os.path.join(app.config['OUTPUT_FOLDER'], session_id), filename)


@app.route('/api/history', methods=['GET'])
def get_history():
    try:
        upload_dir = app.config['UPLOAD_FOLDER']
        history = []

        if os.path.exists(upload_dir):
            for session_id in os.listdir(upload_dir):
                session_path = os.path.join(upload_dir, session_id)
                if os.path.isdir(session_path):
                    files = os.listdir(session_path)
                    if files:
                        first_file = files[0]
                        file_path = os.path.join(session_path, first_file)
                        stat = os.stat(file_path)

                        original_url = f"/uploads/{session_id}/{first_file}"

                        history.append({
                            'session_id': session_id,
                            'filename': first_file,
                            'created_time': stat.st_mtime,
                            'original': original_url
                        })

        history.sort(key=lambda x: x['created_time'], reverse=True)

        for item in history:
            item['created_time'] = os.path.getmtime(os.path.join(upload_dir, item['session_id'], item['filename']))

        return jsonify({'history': history})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/history/<session_id>', methods=['GET'])
def get_history_detail(session_id):
    try:
        upload_dir = os.path.join(app.config['UPLOAD_FOLDER'], session_id)
        output_dir = os.path.join(app.config['OUTPUT_FOLDER'], session_id)

        if not os.path.exists(upload_dir):
            return jsonify({'error': 'History not found'}), 404

        files = os.listdir(upload_dir)
        if not files:
            return jsonify({'error': 'No files found'}), 404

        image_paths = []
        for f in files:
            ext = f.lower().split('.')[-1] if '.' in f else ''
            if ext in ['png', 'jpg', 'jpeg', 'bmp']:
                image_paths.append(os.path.join(upload_dir, f))

        results = []

        for img_path in image_paths:
            base_name = os.path.splitext(os.path.basename(img_path))[0]

            result_img_path = os.path.join(output_dir, f"{base_name}_result.png")
            text_only_img_path = os.path.join(output_dir, f"{base_name}_text_only.png")
            texts_json_path = os.path.join(output_dir, f"{base_name}_texts.json")

            if os.path.exists(result_img_path) and os.path.exists(text_only_img_path):
                original_url = f"/uploads/{session_id}/{os.path.basename(img_path)}"
                result_url = f"/outputs/{session_id}/{os.path.basename(result_img_path)}"
                text_only_url = f"/outputs/{session_id}/{os.path.basename(text_only_img_path)}"

                texts_data = []
                if os.path.exists(texts_json_path):
                    with open(texts_json_path, 'r', encoding='utf-8') as f:
                        texts_data = json.load(f)

                results.append({
                    'original': original_url,
                    'result': result_url,
                    'text_only': text_only_url,
                    'page': base_name,
                    'texts': texts_data
                })

        return jsonify({
            'session_id': session_id,
            'results': results
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/history/<session_id>', methods=['DELETE'])
def delete_history(session_id):
    try:
        upload_dir = os.path.join(app.config['UPLOAD_FOLDER'], session_id)
        output_dir = os.path.join(app.config['OUTPUT_FOLDER'], session_id)

        deleted = False

        if os.path.exists(upload_dir):
            shutil.rmtree(upload_dir)
            deleted = True

        if os.path.exists(output_dir):
            shutil.rmtree(output_dir)
            deleted = True

        if not deleted:
            return jsonify({'error': 'History not found'}), 404

        return jsonify({'success': True})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/history/<session_id>/texts', methods=['PUT'])
def update_text(session_id):
    """更新OCR识别的文字内容并重新生成预览图"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        page = data.get('page')
        index = data.get('index')
        new_text = data.get('text')
        
        if page is None or index is None or new_text is None:
            return jsonify({'error': 'Missing required fields: page, index, text'}), 400
        
        output_dir = os.path.join(app.config['OUTPUT_FOLDER'], session_id)
        upload_dir = os.path.join(app.config['UPLOAD_FOLDER'], session_id)
        
        if not os.path.exists(output_dir):
            return jsonify({'error': 'History not found'}), 404
        
        # 读取JSON文件
        texts_json_path = os.path.join(output_dir, f"{page}_texts.json")
        if not os.path.exists(texts_json_path):
            return jsonify({'error': 'Page not found'}), 404
        
        with open(texts_json_path, 'r', encoding='utf-8') as f:
            texts_data = json.load(f)
        
        # 验证索引
        if index < 0 or index >= len(texts_data):
            return jsonify({'error': 'Index out of range'}), 400
        
        # 更新文字
        texts_data[index]['text'] = new_text
        
        # 保存回JSON文件
        with open(texts_json_path, 'w', encoding='utf-8') as f:
            json.dump(texts_data, f, ensure_ascii=False)
        
        # 重新生成预览图
        import time
        import cv2
        from ocr_engine import create_text_only_result
        
        # 查找原图
        original_image_path = None
        for ext in ['png', 'jpg', 'jpeg', 'bmp']:
            potential_path = os.path.join(upload_dir, f"{page}.{ext}")
            if os.path.exists(potential_path):
                original_image_path = potential_path
                break
        
        text_only_url = None
        if original_image_path:
            text_only_img_path = os.path.join(output_dir, f"{page}_text_only.png")
            text_only_img = create_text_only_result(original_image_path, texts_data)
            cv2.imwrite(text_only_img_path, cv2.cvtColor(text_only_img, cv2.COLOR_RGB2BGR))
            timestamp = int(time.time())
            text_only_url = f"/outputs/{session_id}/{page}_text_only.png?t={timestamp}"
        
        return jsonify({
            'success': True,
            'texts': texts_data,
            'text_only_url': text_only_url
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['OUTPUT_FOLDER'], exist_ok=True)

    # 自动打开浏览器
    try:
        webbrowser.open('http://127.0.0.1:5005')
        print("[APP] Opening browser...")
    except Exception as e:
        print(f"[APP] Failed to open browser: {e}")

    app.run(host='0.0.0.0', port=5005, debug=False, use_reloader=False)
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['OUTPUT_FOLDER'], exist_ok=True)

    app.run(host='0.0.0.0', port=5005, debug=False, use_reloader=False)
