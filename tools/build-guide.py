"""Render the maintained release guide offline using Python's standard library.

This intentionally supports only the Markdown constructs used in our guide:
headings, paragraphs, tables, flat lists and fenced code. No web fetches.
"""
from pathlib import Path
import html
import re

ROOT = Path(__file__).resolve().parent.parent


def inline(text):
    parts = re.split(r"(`[^`]+`)", text)
    for i, part in enumerate(parts):
        if part.startswith("`") and part.endswith("`"):
            parts[i] = "<code>" + html.escape(part[1:-1]) + "</code>"
        else:
            part = html.escape(part)
            part = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", part)
            part = re.sub(r"\[([^]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', part)
            parts[i] = part
    return "".join(parts)


def render(source):
    lines = source.splitlines()
    output, toc, paragraph = [], [], []
    current_list = None
    i = 0

    def flush():
        if paragraph:
            output.append("<p>" + inline(" ".join(paragraph)) + "</p>")
            paragraph.clear()

    while i < len(lines):
        line = lines[i]
        item = re.match(r"^(?:([-*]) |(\d+)\. )(.*)$", line)
        list_type = ("ul" if item.group(1) else "ol") if item else None
        if current_list and list_type != current_list:
            output.append("</" + current_list + ">")
            current_list = None
        if line.startswith("```"):
            flush()
            code = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                code.append(lines[i])
                i += 1
            output.append("<pre><code>" + html.escape("\n".join(code)) + "</code></pre>")
        elif line.startswith("|"):
            flush()
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                if not all(re.fullmatch(r":?-+:?", c) for c in cells):
                    rows.append(cells)
                i += 1
            output.append('<div class="table-scroll"><table>')
            for n, row in enumerate(rows):
                tag = "th" if n == 0 else "td"
                output.append("<tr>" + "".join(f"<{tag}>{inline(c)}</{tag}>" for c in row) + "</tr>")
            output.append("</table></div>")
            continue
        elif re.match(r"^#{1,6} ", line):
            flush()
            level, text = len(line) - len(line.lstrip("#")), line.lstrip("# ")
            anchor = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
            output.append(f'<h{level} id="{anchor}">{inline(text)}</h{level}>')
            if level == 2:
                toc.append(f'<a href="#{anchor}">{inline(text)}</a>')
                if text == "Creature encounters and animation":
                    output.append('<figure><img src="Attendant_Contact_Poses.png" alt="Nine rendered poses of the Attendant showing stalking, peeking, planted door contact, crouched search and run transition"><figcaption>Actual Blender pose renders. Browser playback remains to be playtested.</figcaption></figure>')
                if text == "More detailed rooms and properly supported props":
                    output.append('<figure><img src="Meridian_Worn_Details_Contact_Sheet.png" alt="Actual Blender renders of twelve worn garage props"><figcaption>Version 1.13 original CC0 worn details. Mounting and in-game browser review remain distinct checks.</figcaption></figure>')
                if text == "Earlier industrial details":
                    output.append('<figure><img src="Meridian_Industrial_Contact_Sheet.png" alt="Actual renders of the 24 low-poly industrial models"><figcaption>Original CC0 props supplied as editable Blender source and local GLBs.</figcaption></figure>')
        elif item:
            flush()
            if not current_list:
                current_list = list_type
                output.append("<" + current_list + ">")
            output.append("<li>" + inline(item.group(3)) + "</li>")
        elif not line.strip():
            flush()
        else:
            paragraph.append(line)
        i += 1
    flush()
    if current_list:
        output.append("</" + current_list + ">")
    return "\n".join(output), "\n".join(toc)


body, toc = render((ROOT / "docs/UPDATE_1_14.md").read_text(encoding="utf-8"))
style = """
*{box-sizing:border-box}body{margin:0;background:#eff0e8;color:#203631;font:16px/1.8 system-ui,sans-serif}
header{background:#132b2b;color:#e4e7d3;padding:60px max(24px,calc((100vw - 960px)/2))}
header small{color:#d0ba85;letter-spacing:3px}header h1{font:56px/1.1 Georgia,serif;margin:20px 0}header p{max-width:650px;color:#bbcabe}
main{max-width:1016px;margin:auto;padding:36px 28px 90px}article{max-width:840px;margin:auto}
nav{display:grid;grid-template-columns:1fr 1fr;gap:10px 26px;padding:25px;background:#e0e5d8;margin-bottom:45px}
a{color:#345b51;text-underline-offset:4px}h1{font:40px/1.2 Georgia,serif}h2{font:30px/1.3 Georgia,serif;border-top:1px solid #bdc8b9;padding-top:32px;margin-top:48px;scroll-margin:25px}
p,li{max-width:76ch}li{padding-left:5px;margin-bottom:9px}.table-scroll{overflow:auto;margin:24px 0}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;vertical-align:top;padding:12px;border-bottom:1px solid #bdc8b9}th{background:#dfe5d7}
code{font:13px/1.7 ui-monospace,monospace;background:#dfe5d7;padding:2px 4px;overflow-wrap:anywhere}pre{background:#18312f;color:#e1e7d7;padding:20px;overflow:auto}pre code{background:none;color:inherit;padding:0;overflow-wrap:normal}
figure{margin:28px 0}img{display:block;max-width:100%;height:auto}figcaption{font-size:13px;color:#536b61;margin-top:10px}
footer{padding:25px 0;border-top:1px solid #bdc8b9;margin-top:50px;font-size:14px}
@media(max-width:650px){nav{grid-template-columns:1fr}header h1{font-size:42px}main{padding:25px 18px 60px}h1{font-size:32px}h2{font-size:26px}}
@media print{body{background:white;font-size:11pt}header,nav{display:none}main{padding:0}h2{break-before:page}pre{white-space:pre-wrap}figure{max-height:240mm}img{max-height:220mm;object-fit:contain}a{color:inherit}}
"""
page = f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Last Vehicle 1.14 — Build & Play Guide</title><style>{style}</style></head><body><header><small>A GINGRSNAPS PROJECT</small><h1>One last way out.</h1><p>Your complete guide to playing, understanding and editing Last Vehicle 1.14.</p></header><main><nav aria-label="Guide contents">{toc}</nav><article>{body}<footer>Further reading: <a href="BUILD_AND_EDIT_GUIDE.md">Beginner build guide</a> · <a href="Full_Code.md">Complete commented source</a> · <a href="VERIFICATION.md">Verification report</a></footer></article></main></body></html>'
(ROOT / "docs/LastVehicle_Guide.html").write_text(page, encoding="utf-8")
print("Updated docs/LastVehicle_Guide.html")
