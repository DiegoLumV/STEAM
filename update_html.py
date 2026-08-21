import re

with open(r'C:\Users\juan_\OneDrive\Documentos\Doctorado\STEAM\STEAM\src\learn.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Remove SVG elements inside .path-container
html = re.sub(r'<svg class="path-svg"[^>]*>[\s\S]*?<\/svg>', '', html)

def replace_nodes(match):
    block = match.group(0)
    classes = ["center", "left", "center", "right", "center", "left"]
    count = [0]
    def repl_col(m):
        cls = classes[count[0] % 6]
        count[0] += 1
        return f'<div class="node-col {cls}">'
    
    return re.sub(r'<div class="node-col (top|bottom)">', repl_col, block)

html = re.sub(r'<div class="lesson-nodes" id="nodes-[^"]+">[\s\S]*?(?=<\/div>\s*<\/section>)', replace_nodes, html)

with open(r'C:\Users\juan_\OneDrive\Documentos\Doctorado\STEAM\STEAM\src\learn.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('HTML updated successfully.')
