from pathlib import Path

root = Path(__file__).resolve().parent
html = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'css' / 'styles.css').read_text(encoding='utf-8')
data_js = (root / 'js' / 'data.js').read_text(encoding='utf-8')
app_js = (root / 'js' / 'app.js').read_text(encoding='utf-8')

html = html.replace('  <link rel="manifest" href="manifest.webmanifest">\n', '')
html = html.replace('  <link rel="icon" href="assets/icon.svg" type="image/svg+xml">\n', '')
html = html.replace('  <link rel="stylesheet" href="css/styles.css?v=20261019-3">', f'  <style>\n{css}\n  </style>')
html = html.replace('  <script src="js/data.js?v=20261019-3" defer></script>\n  <script src="js/app.js?v=20261019-3" defer></script>',
                    f'  <script>\n{data_js}\n  </script>\n  <script>\n{app_js}\n  </script>')

out = root / '时间之书_离线版.html'
out.write_text(html, encoding='utf-8')
print(f'WROTE {out.name} {out.stat().st_size} bytes')
