# Đóng gói quán (GLB + chỗ ngồi + đèn + lưới đi lại) thành demo/model.js cho bản thử demo/index.html.
# Chạy từ thư mục gốc dự án:  python tools/pack_model.py
import base64, json, shutil

shutil.copy('cafe3.glb', 'demo/chilly-coffee.glb')
glb = open('demo/chilly-coffee.glb', 'rb').read()
extra = json.load(open('cafe3.glb.json'))
nav = json.load(open('nav.json'))
with open('demo/model.js', 'w', encoding='utf-8') as f:
    f.write('window.CAFE_NAV=' + json.dumps(nav) + ';')
    f.write('window.CAFE_SEATS=' + json.dumps(extra['seats'], ensure_ascii=False) + ';')
    f.write('window.CAFE_LIGHTS=' + json.dumps(extra['lights']) + ';')
    f.write('window.CAFE_GLB="' + base64.b64encode(glb).decode() + '";')
print('demo/model.js:', len(glb), 'bytes GLB')
