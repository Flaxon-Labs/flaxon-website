"""Export the maintained Markdown book to a paginated PDF with linked contents."""
from pathlib import Path
import re
import html
import textwrap
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Preformatted, Image, KeepTogether, CondPageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Embed real fonts so readers do not depend on PDF viewer substitution.
font_root = Path("/usr/share/fonts/truetype/dejavu")
if font_root.exists():
    pdfmetrics.registerFont(TTFont("BookSans", str(font_root / "DejaVuSans.ttf")))
    pdfmetrics.registerFont(TTFont("BookSansBold", str(font_root / "DejaVuSans-Bold.ttf")))
    pdfmetrics.registerFont(TTFont("BookMono", str(font_root / "DejaVuSansMono.ttf")))
    pdfmetrics.registerFontFamily("BookSans", normal="BookSans", bold="BookSansBold", italic="BookSans", boldItalic="BookSansBold")
else:
    # Portable base fonts remain available on systems without DejaVu.
    from reportlab.pdfbase.pdfmetrics import Font
    pdfmetrics.registerFont(Font("BookSans", "Helvetica", "WinAnsiEncoding"))
    pdfmetrics.registerFont(Font("BookSansBold", "Helvetica-Bold", "WinAnsiEncoding"))
    pdfmetrics.registerFont(Font("BookMono", "Courier", "WinAnsiEncoding"))
    pdfmetrics.registerFontFamily("BookSans", normal="BookSans", bold="BookSansBold", italic="BookSans", boldItalic="BookSansBold")

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'downloads/flaxon-project-manager-course.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
NAVY = HexColor('#14243A')
BLUE = HexColor('#1464AA')
MUTED = HexColor('#536377')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyBook', fontName='BookSans', fontSize=9.5, leading=13.6, textColor=NAVY, spaceAfter=7))
styles.add(ParagraphStyle(name='ChapterBook', fontName='BookSansBold', fontSize=21, leading=26, textColor=NAVY, spaceAfter=18))
styles.add(ParagraphStyle(name='SectionBook', fontName='BookSansBold', fontSize=12, leading=16, textColor=BLUE, spaceBefore=9, spaceAfter=6, keepWithNext=True))
styles.add(ParagraphStyle(name='CodeBook', fontName='BookMono', fontSize=7.5, leading=10.3, textColor=NAVY, backColor=HexColor('#F0F4F8'), borderPadding=8, spaceBefore=5, spaceAfter=12))
styles.add(ParagraphStyle(name='CoverTitle', fontName='BookSansBold', fontSize=36, leading=42, textColor=NAVY, spaceAfter=20))
styles.add(ParagraphStyle(name='CoverSub', fontName='BookSans', fontSize=16, leading=24, textColor=BLUE, spaceAfter=20))
styles.add(ParagraphStyle(name='SmallBook', fontName='BookSans', fontSize=9, leading=13, textColor=MUTED, spaceAfter=8))

def inline(s):
    # Deliberately small Markdown subset; escape before formatting.
    s = html.escape(s, quote=False)
    s = re.sub(r'`([^`]+)`', r'<font name="BookMono">\1</font>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', s)
    s = re.sub(r'\[([^\]]+)\]\((https?://[^)]+)\)', r'<link href="\2" color="#1464AA">\1</link>', s)
    # Standard PDF fonts do not cover arrows/ellipsis; use readable equivalents.
    return s.replace('→', '-&gt;').replace('←', '&lt;-').replace('…', '...').replace('–','-').replace('—','-').replace('’',"'")

class BookDoc(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark'):
            self.canv.bookmarkPage(flowable.bookmark)
            self.canv.addOutlineEntry(flowable.getPlainText(), flowable.bookmark, level=0)

def footer(canvas, doc):
    if doc.page == 1:
        return
    canvas.saveState()
    canvas.setStrokeColor(HexColor('#D9E2EC'))
    canvas.line(54, 42, 558, 42)
    canvas.setFont('BookSans', 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(54, 28, 'FLAXON + TELOCE  |  PROJECT MANAGER COURSE')
    canvas.drawRightString(558, 28, str(doc.page))
    canvas.restoreState()

course = ROOT / 'content/framework/docs/fullstack/project-manager'
overrides = ROOT / 'content/overrides/docs/fullstack/project-manager'
text = "# Build a Full-Stack Project Manager\n\n## Read this first\n\nUse Python 3.12 with published Flaxon 0.3.0 and Teloce-Py 0.3.0. Generate your own project, follow each chapter in order, and commit a checkpoint after its checks pass. CREATE supplies a new file; REPLACE supplies a complete file; EDIT MARKED BLOCKS replaces only the indicated block. The website is the source of copyable code; printed code wraps to fit the page.\n\n"
for number in range(1, 17):
    name = f'{number:02d}.md'
    path = overrides / name if (overrides / name).exists() else course / name
    text += path.read_text() + '\n\n' 
headings = []
in_fence = False
for line in text.splitlines():
    if line.startswith('```'):
        in_fence = not in_fence
    elif not in_fence and line.startswith('# '):
        headings.append(line[2:])
headings = headings[1:]
bookmarks = {title: 'section-'+str(i) for i,title in enumerate(headings)}
story = [Spacer(1,25)]
logo = ROOT/'assets/images/course-flaxon.png'
w,h = ImageReader(str(logo)).getSize()
story += [Image(str(logo), width=150, height=150*h/w, hAlign='LEFT'), Spacer(1,24), Paragraph('Build a Full-Stack<br/>Project Manager', styles['CoverTitle']), Paragraph('Flaxon + Teloce HTML SPA<br/>Signals, Admin/CMS, PWA, and MinifyJS', styles['CoverSub']), Spacer(1,20), Paragraph('Aldane Hutchinson', styles['SectionBook']), Paragraph('Flaxon 0.3.0 + Teloce-Py 0.3.0 | October 2026', styles['SmallBook']), Spacer(1,25), Paragraph('Build protected APIs first. Connect the interface to working data. Verify the whole application before deployment.',styles['BodyBook']), Paragraph('Start with the CLI. Follow exact file edits, run each chapter, and build a working application through deployment.', styles['SmallBook']), PageBreak()]
story.append(Paragraph('Contents',styles['ChapterBook']))
for title in headings:
    story.append(Paragraph(f'<link href="#{bookmarks[title]}" color="#1464AA">{inline(title)}</link>',styles['BodyBook']))
story.append(PageBreak())
# Skip the cover metadata already rendered; retain the reader guide.
lines=text[text.index('## Read this first'):].splitlines()
i=0
skip_contents=False
while i<len(lines):
    line=lines[i]
    if line=='## Contents':
        skip_contents=True;i+=1;continue
    if skip_contents:
        if line.startswith('# '):skip_contents=False
        else:i+=1;continue
    if not line.strip():i+=1;continue
    if line.startswith('```'):
        i+=1;code=[]
        while i<len(lines) and not lines[i].startswith('```'):
            raw=lines[i].expandtabs(4).replace('…','...').replace('←','<-').replace('–','-').replace('—','-')
            # Print-only wrapping: exact source remains in Markdown.
            wrapped=textwrap.wrap(raw, width=94, break_long_words=True, break_on_hyphens=False, replace_whitespace=False, drop_whitespace=False, subsequent_indent='    ')
            code.extend(wrapped or [''])
            i+=1
        # Small chunks can split naturally across pages without a giant code box.
        for start in range(0,len(code),34):
            story.append(Preformatted('\n'.join(code[start:start+34]),styles['CodeBook']))
        i+=1;continue
    if line.startswith('# '):
        title=line[2:]
        if title.startswith('Appendix'): story.append(PageBreak())
        else: story.extend([CondPageBreak(430), Spacer(1,16)])
        p=Paragraph(inline(title),styles['ChapterBook']);p.bookmark=bookmarks[title];story.append(p);i+=1;continue
    if line.startswith('### '):
        story.append(Paragraph(inline(line[4:]),styles['SectionBook']));i+=1;continue
    if line.startswith('## '):
        story.append(Paragraph(inline(line[3:]),styles['SectionBook']));i+=1;continue
    if line.startswith('!['):i+=1;continue
    if line.startswith('- ') or re.match(r'^\d+\. ', line):
        story.append(Paragraph(('&#8226; '+inline(line[2:])) if line.startswith('- ') else inline(line), styles['BodyBook']));i+=1;continue
    paragraph=[line];i+=1
    while i<len(lines) and lines[i].strip() and not lines[i].startswith(('#','```','- ')) and not re.match(r'^\d+\. ', lines[i]):
        paragraph.append(lines[i]);i+=1
    story.append(Paragraph(inline(' '.join(paragraph)),styles['BodyBook']))
doc=BookDoc(str(OUT),pagesize=(612,792),rightMargin=54,leftMargin=54,topMargin=52,bottomMargin=56,title='Build a Full-Stack Project Manager',author='Aldane Hutchinson')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
