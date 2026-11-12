# Đóng gói quán (GLB + chỗ ngồi + đèn + lưới đi lại) thành prototype/demo/model.js cho bản thử.
# model.js là file sinh ra (không commit). Chạy từ thư mục gốc dự án:  python tools/pack_model.py
import base64, json

glb = open('assets/cafe/cafe.glb', 'rb').read()
extra = json.load(open('assets/cafe/cafe.meta.json', encoding='utf-8'))
nav = json.load(open('assets/cafe/nav.json'))
with open('prototype/demo/model.js', 'w', encoding='utf-8') as f:
    f.write('window.CAFE_NAV=' + json.dumps(nav) + ';')
    f.write('window.CAFE_SEATS=' + json.dumps(extra['seats'], ensure_ascii=False) + ';')
    f.write('window.CAFE_LIGHTS=' + json.dumps(extra['lights']) + ';')
    f.write('window.CAFE_GLB="' + base64.b64encode(glb).decode() + '";')
print('prototype/demo/model.js:', len(glb), 'bytes GLB')
