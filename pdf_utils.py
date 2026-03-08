import os
import sys

if getattr(sys, 'frozen', False):
    BASE_DIR = sys._MEIPASS
    # 尝试多个可能的poppler路径
    possible_paths = [
        os.path.join(BASE_DIR, 'poppler', 'bin'),
        os.path.join(BASE_DIR, 'poppler', 'Library', 'bin'),
    ]
    POPPLER_PATH = None
    for p in possible_paths:
        if os.path.exists(p):
            POPPLER_PATH = p
            break
    if POPPLER_PATH is None:
        POPPLER_PATH = possible_paths[0]  # 使用第一个作为默认值
else:
    POPPLER_PATH = r"D:\texlive\2023\bin\windows"
import sys

if getattr(sys, 'frozen', False):
    BASE_DIR = sys._MEIPASS
    POPPLER_PATH = os.path.join(BASE_DIR, 'poppler', 'bin')
else:
    POPPLER_PATH = r"D:\texlive\2023\bin\windows"


def pdf_to_images(pdf_path, output_folder, dpi=200):
    print(f"[pdf_utils] Starting PDF conversion: {pdf_path}", flush=True)
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
        print(f"[pdf_utils] Created output folder: {output_folder}", flush=True)

    if os.path.exists(POPPLER_PATH):
        os.environ['PATH'] = os.environ.get('PATH', '') + os.pathsep + POPPLER_PATH
        print(f"[pdf_utils] Added Poppler to PATH: {POPPLER_PATH}", flush=True)

    from pdf2image import convert_from_path
    print(f"[pdf_utils] Calling convert_from_path...", flush=True)
    images = convert_from_path(pdf_path, dpi=dpi)
    print(f"[pdf_utils] Converted to {len(images)} images", flush=True)

    image_paths = []
    for i, image in enumerate(images):
        image_path = os.path.join(output_folder, f"page_{i + 1}.png")
        image.save(image_path, "PNG")
        image_paths.append(image_path)
        print(f"[pdf_utils] Saved page {i + 1}: {image_path}", flush=True)

    print(f"[pdf_utils] Returning {len(image_paths)} image paths", flush=True)
    return image_paths
