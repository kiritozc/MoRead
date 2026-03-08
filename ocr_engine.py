import os
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


FONT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts', 'SimHei.ttf')


def create_overlay_image(image_path, ocr_results, alpha=0.3):
    """创建叠加图 - 在原始图片上绘制识别框和文字"""
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Cannot read image: {image_path}")

    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    h, w = img.shape[:2]

    faded = cv2.convertScaleAbs(img_rgb, alpha=alpha, beta=0)

    fontSize = max(16, int(h / 50))
    try:
        if os.path.exists(FONT_PATH):
            font = ImageFont.truetype(FONT_PATH, fontSize)
        else:
            font = ImageFont.load_default()
            print("[OCR] Warning: Custom font not found, using default font")
    except Exception as e:
        print(f"[OCR] Warning: Could not load font: {e}")
        font = ImageFont.load_default()

    result_img = Image.fromarray(faded)
    draw = ImageDraw.Draw(result_img)

    if not ocr_results:
        print("[OCR] No OCR results to draw")
        return np.array(result_img)

    for item in ocr_results:
        try:
            box = item.get('box')
            text = item.get('text')

            if box is None or text is None:
                continue

            if not box or len(box) < 4:
                continue

            pts_list = [(int(p[0]), int(p[1])) for p in box]
            if len(pts_list) >= 4:
                draw.line(pts_list + [pts_list[0]], fill=(255, 0, 0), width=2)

            x_min = int(min([p[0] for p in box]))
            y_min = int(min([p[1] for p in box]))

            if isinstance(text, str):
                try:
                    draw.text((x_min, y_min - fontSize), text, font=font, fill=(255, 0, 0))
                except Exception as e:
                    print(f"[OCR] Warning: Could not draw text: {e}")
            else:
                draw.text((x_min, y_min - fontSize), str(text), font=font, fill=(255, 0, 0))
        except Exception as e:
            print(f"Error drawing box: {e}")
            continue

    result_array = np.array(result_img)

    return result_array


def create_text_only_result(image_path, ocr_results):
    """创建纯文字结果图 - 白底+文字框+文字，支持竖排"""
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Cannot read image: {image_path}")

    h, w = img.shape[:2]

    # 创建白色背景
    result_img = Image.new('RGB', (w, h), color='white')
    draw = ImageDraw.Draw(result_img)

    if not ocr_results:
        print("[OCR] No OCR results to draw")
        return np.array(result_img)

    # 计算合适的字体大小
    fontSize = max(20, int(min(h, w) / 40))
    try:
        if os.path.exists(FONT_PATH):
            font = ImageFont.truetype(FONT_PATH, fontSize)
            font_vertical = ImageFont.truetype(FONT_PATH, max(16, fontSize - 2))
        else:
            font = ImageFont.load_default()
            font_vertical = ImageFont.load_default()
            print("[OCR] Warning: Custom font not found, using default font")
    except Exception as e:
        print(f"[OCR] Warning: Could not load font: {e}")
        font = ImageFont.load_default()
        font_vertical = ImageFont.load_default()

    for item in ocr_results:
        try:
            box = item.get('box')
            text = item.get('text')

            if box is None or text is None:
                continue

            if not box or len(box) < 4:
                continue

            # 绘制文字框
            pts_list = [(int(p[0]), int(p[1])) for p in box]
            if len(pts_list) >= 4:
                draw.line(pts_list + [pts_list[0]], fill=(0, 120, 215), width=2)

            # 计算文字框的尺寸和方向
            x_coords = [p[0] for p in box]
            y_coords = [p[1] for p in box]
            x_min, x_max = min(x_coords), max(x_coords)
            y_min, y_max = min(y_coords), max(y_coords)
            box_width = x_max - x_min
            box_height = y_max - y_min

            # 判断是否为竖排文字（高度大于宽度）
            is_vertical = box_height > box_width * 1.2

            if isinstance(text, str) and text.strip():
                try:
                    if is_vertical and len(text) > 1:
                        # 竖排文字：从上到下排列
                        char_size = min(box_width, box_height / len(text)) * 0.8
                        char_size = max(12, min(char_size, fontSize))
                        try:
                            char_font = ImageFont.truetype(FONT_PATH, int(char_size))
                        except:
                            char_font = font_vertical

                        # 计算起始位置（居中）
                        total_height = len(text) * char_size
                        start_y = y_min + (box_height - total_height) / 2
                        center_x = x_min + box_width / 2

                        for i, char in enumerate(text):
                            char_y = start_y + i * char_size
                            # 绘制文字（带阴影效果）
                            draw.text((center_x - char_size/3, char_y), char, font=char_font, fill=(0, 0, 0))
                    else:
                        # 横排文字
                        text_width = box_width * 0.9
                        text_height = box_height * 0.8
                        # 调整字体大小以适应框
                        adjusted_font_size = min(fontSize, int(text_height * 0.8))
                        try:
                            adjusted_font = ImageFont.truetype(FONT_PATH, adjusted_font_size)
                        except:
                            adjusted_font = font

                        # 计算文字位置（居中）
                        text_x = x_min + (box_width - text_width) / 2
                        text_y = y_min + (box_height - adjusted_font_size) / 2

                        # 绘制文字
                        draw.text((text_x, text_y), text, font=adjusted_font, fill=(0, 0, 0))
                except Exception as e:
                    print(f"[OCR] Warning: Could not draw text: {e}")
        except Exception as e:
            print(f"Error drawing text result: {e}")
            continue

    result_array = np.array(result_img)

    return result_array


def process_image(image_path, output_path):
    try:
        from paddleocr import PaddleOCR

        # 尝试使用 GPU，失败则回退到 CPU
        devices_to_try = ["gpu:0", "cpu"]
        ocr = None
        for device in devices_to_try:
            try:
                print(f"尝试使用设备：{device}")
                ocr = PaddleOCR(
                    text_detection_model_name="PP-OCRv5_server_det",
                    text_recognition_model_name="PP-OCRv5_server_rec",
                    text_detection_model_dir="models/PP-OCRv5_server_det",
                    text_recognition_model_dir="models/PP-OCRv5_server_rec",
                    use_doc_orientation_classify=False,
                    use_doc_unwarping=False,
                    use_textline_orientation=False,
                    device=device
                )  # 更换 PP-OCRv5_server 模型
                print(f"成功使用设备：{device}")
                break  # 初始化成功，跳出循环
            except Exception as e:
                print(f"使用设备 {device} 失败: {e}")
                if device == devices_to_try[-1]:  # 最后一个设备也失败，抛出异常
                    raise
                else:
                    print("尝试下一个设备...")
                    continue

        print(f"识别{image_path}...")
        result = ocr.predict(image_path)

        ocr_results = []
        if result:
            for res in result:
                if hasattr(res, 'json'):
                    res_data = res.json
                    if 'res' in res_data:
                        res_data = res_data['res']
                    texts = res_data.get('rec_texts', [])
                    polys = res_data.get('rec_polys', [])
                    scores = res_data.get('rec_scores', [])

                    for text, poly, score in zip(texts, polys, scores):
                        if isinstance(text, bytes):
                            text = text.decode('utf-8', errors='replace')

                        ocr_results.append({
                            'box': poly,
                            'text': text,
                            'score': float(score)
                        })
                elif isinstance(res, (list, tuple)):
                    for line in res:
                        if line and len(line) >= 2:
                            box = line[0]
                            text_data = line[1]
                            text = text_data[0] if isinstance(text_data, (list, tuple)) else text_data
                            score = text_data[1] if isinstance(text_data, (list, tuple)) else 1.0

                            if isinstance(text, bytes):
                                text = text.decode('utf-8', errors='replace')

                            ocr_results.append({
                                'box': [[int(p[0]), int(p[1])] for p in box],
                                'text': text,
                                'score': float(score)
                            })

        print(f"[OCR] Found {len(ocr_results)} results")
    except Exception as e:
        print(f"[OCR] Error: {e}")
        import traceback
        traceback.print_exc()
        ocr_results = []

    try:
        result_img = create_overlay_image(image_path, ocr_results)
        result_bgr = cv2.cvtColor(result_img, cv2.COLOR_RGB2BGR)
        cv2.imwrite(output_path, result_bgr)
        final_img = result_bgr
    except Exception as e:
        print(f"[OCR] Error creating overlay: {e}")
        import traceback
        traceback.print_exc()
        img = cv2.imread(image_path)
        if img is None:
            img_path_ext = os.path.splitext(image_path)[1].lower()
            if img_path_ext == '.pdf':
                pdf_dir = os.path.dirname(image_path)
                pdf_base = os.path.splitext(os.path.basename(image_path))[0]
                for f in os.listdir(pdf_dir):
                    if f.endswith('.png') and f.startswith('page_'):
                        img = cv2.imread(os.path.join(pdf_dir, f))
                        print(f"[OCR] Using converted PDF image: {os.path.join(pdf_dir, f)}")
                        break
        if img is not None:
            cv2.imwrite(output_path, img)
            final_img = img
        else:
            final_img = None

    return ocr_results, final_img
