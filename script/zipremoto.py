# Lê zips do Zenodo por range requests: lista o índice e extrai só os membros pedidos.
#   lista:   python zipremoto.py lista            -> indice.tsv (zip, membro, tamanho)
#   extrai:  python zipremoto.py extrai T-0414 ... -> laz/<membro>
import io, sys, zipfile, urllib.request, urllib.parse, os, time, csv
from concurrent.futures import ThreadPoolExecutor
ZIPS = {
  'acre':        '7689909/files/transectos acre.zip',
  'rondonia':    '7689909/files/transectos rondonia.zip',
  'amazonas p1': '7636454/files/transectos amazonas p1.zip',
  'amazonas p2': '7636454/files/transectos amazonas p2.zip',
  'mato grosso': '7636454/files/transectos mato grosso.zip',
  **{f'para p{i}': f'7636454/files/transectos para p{i}.zip' for i in range(1, 9)},
  'roraima': '7689693/files/transectos roraima.zip', 'amapa': '7689693/files/transectos amapa.zip',
  'maranhao': '7689210/files/transectos maranhao.zip', 'tocantins': '7689210/files/transectos tocantins.zip',
}
url = lambda z: 'https://zenodo.org/records/' + urllib.parse.quote(ZIPS[z]) + '?download=1'

class Remoto(io.RawIOBase):
    def __init__(self, u):
        self.u, self.p = u, 0
        r = urllib.request.urlopen(urllib.request.Request(u, headers={'Range': 'bytes=0-0'}), timeout=60)
        self.n = int(r.headers['Content-Range'].split('/')[1])
    def seekable(self): return True
    def readable(self): return True
    def tell(self): return self.p
    def seek(self, o, w=0):
        self.p = o if w == 0 else self.p + o if w == 1 else self.n + o
        return self.p
    def read(self, k=-1):
        if k is None or k < 0: k = self.n - self.p
        if k == 0 or self.p >= self.n: return b''
        fim = min(self.p + k, self.n) - 1
        for tent in range(6):
            try:
                req = urllib.request.Request(self.u, headers={'Range': f'bytes={self.p}-{fim}'})
                d = urllib.request.urlopen(req, timeout=120).read(); break
            except Exception as e:
                if tent == 5: raise
                time.sleep(5 * (tent + 1))
        self.p += len(d)
        return d
    def readinto(self, b):
        d = self.read(len(b)); b[:len(d)] = d; return len(d)

def lista():
    def um(z):
        try:
            zf = zipfile.ZipFile(io.BufferedReader(Remoto(url(z)), 1 << 20))
            return [(z, i.filename, i.file_size) for i in zf.infolist()]
        except Exception as e:
            print('falhou', z, e, file=sys.stderr); return []
    with ThreadPoolExecutor(6) as ex: res = list(ex.map(um, ZIPS))
    with open('indice.tsv', 'w') as f:
        w = csv.writer(f, delimiter='\t')
        for r in res:
            for linha in r: w.writerow(linha)
    print(sum(map(len, res)), 'membros em', sum(1 for r in res if r), 'zips')

def extrai(alvos):
    idx = [l.rstrip('\n').split('\t') for l in open('indice.tsv')]
    pedidos = [(z, m) for z, m, _ in idx if any(a in os.path.basename(m) for a in alvos) and m.lower().endswith(('.laz', '.las'))]
    os.makedirs('laz', exist_ok=True)
    def um(zm):
        z, m = zm
        dest = os.path.join('laz', os.path.basename(m))
        if os.path.exists(dest): return f'já existe {dest}'
        zf = zipfile.ZipFile(io.BufferedReader(Remoto(url(z)), 8 << 20))
        with zf.open(m) as src, open(dest + '.tmp', 'wb') as out:
            while (b := src.read(8 << 20)): out.write(b)
        os.rename(dest + '.tmp', dest)
        return f'ok {dest} {os.path.getsize(dest) >> 20} MB'
    with ThreadPoolExecutor(4) as ex:
        for r in ex.map(um, pedidos): print(r, flush=True)
    faltam = [a for a in alvos if not any(a in os.path.basename(m) for _, m in pedidos)]
    if faltam: print('não achei no índice:', faltam)

if __name__ == '__main__':
    lista() if sys.argv[1] == 'lista' else extrai(sys.argv[2:])
