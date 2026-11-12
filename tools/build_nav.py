import os
import trimesh, numpy as np, json, base64
from PIL import Image, ImageDraw
from scipy import ndimage
os.makedirs('tmp', exist_ok=True)
sc = trimesh.load('assets/cafe/cafe.glb')
SKIP = ('Tran', 'San', 'Mat_Duong', 'Via_He', 'Nha_Doi', 'Cua_Ra_Vao', 'Cua_Ra_San', 'Kinh_Phong_Lon', 'Co')
meshes = []
for node in sc.graph.nodes_geometry:
    T, gname = sc.graph[node]
    if node.startswith(SKIP) or str(gname).startswith(SKIP): continue
    g = sc.geometry[gname].copy(); g.apply_transform(T); meshes.append(g)
big = trimesh.util.concatenate(meshes)
X0, X1, Z0, Z1, CELL = -8.0, 7.5, -16.0, 7.5, 0.1
W, Hh = int((X1 - X0) / CELL), int((Z1 - Z0) / CELL)
img = Image.new('L', (W, Hh), 0); d = ImageDraw.Draw(img)
toPx = lambda p: ((p[0] - X0) / CELL, (p[2] - Z0) / CELL)
for h in [0.1, 0.3, 0.55, 0.72, 0.95]:
    segs = trimesh.intersections.mesh_plane(big, plane_normal=[0, 1, 0], plane_origin=[0, h, 0])
    for s0, s1 in segs:
        d.line([toPx(s0), toPx(s1)], fill=255, width=1)
a = np.array(img) > 0
holes = ndimage.binary_fill_holes(a) & ~a
lab, n = ndimage.label(holes)
sizes = ndimage.sum(holes, lab, range(1, n + 1))
for k, sz in enumerate(sizes, 1):
    if sz < 30: a[lab == k] = True
a = ndimage.binary_dilation(a, structure=np.array([[0,1,0],[1,1,1],[0,1,0]]))
# ngoài phạm vi khu đất = chặn
bits = np.packbits(a.astype(np.uint8).flatten())
out = {'x0': X0, 'z0': Z0, 'cell': CELL, 'w': W, 'h': Hh, 'data': base64.b64encode(bits.tobytes()).decode()}
json.dump(out, open('assets/cafe/nav.json', 'w'))
Image.fromarray((~a * 255).astype(np.uint8)).resize((W * 3, Hh * 3), Image.NEAREST).save('tmp/nav.png')
print(W, Hh, a.mean())
