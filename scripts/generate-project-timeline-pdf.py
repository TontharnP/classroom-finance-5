from pathlib import Path
import textwrap

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Flowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "generated" / "project-timeline.md"
OUTPUT = ROOT / "docs" / "generated" / "classroom-finance-project-timeline.pdf"


class TimelineMarker(Flowable):
    def __init__(self, color="#2563EB"):
        super().__init__()
        self.width = 14
        self.height = 14
        self.color = colors.HexColor(color)

    def draw(self):
        canvas = self.canv
        canvas.setFillColor(self.color)
        canvas.circle(7, 7, 5, fill=1, stroke=0)


def read_sections():
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    title = lines[0].lstrip("# ").strip()
    intro = []
    sections = []
    current = None

    for line in lines[1:]:
        if line.startswith("### "):
            if current:
                sections.append(current)
            current = {"title": line[4:].strip(), "body": []}
        elif line.startswith("## "):
            if current:
                sections.append(current)
            heading = line[3:].strip()
            current = None if heading == "Timeline" else {"heading": heading, "body": []}
        elif current:
            current["body"].append(line)
        elif line.strip():
            intro.append(line.strip())

    if current:
        sections.append(current)

    return title, intro, sections


def markdown_to_paragraphs(lines, styles):
    paragraphs = []
    buffer = []

    def flush():
        if buffer:
            text = " ".join(buffer).strip()
            text = text.replace("`", "")
            paragraphs.append(Paragraph(text, styles["body"]))
            buffer.clear()

    for raw in lines:
        line = raw.strip()
        if not line:
            flush()
            continue
        if line.startswith("- "):
            flush()
            item = line[2:].replace("`", "")
            paragraphs.append(Paragraph(f"- {item}", styles["bullet"]))
        elif line[:3].endswith(". ") and line[0].isdigit():
            flush()
            paragraphs.append(Paragraph(line, styles["bullet"]))
        else:
            buffer.append(line)

    flush()
    return paragraphs


def build_pdf():
    title, intro, sections = read_sections()

    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="coverTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=28,
            leading=33,
            textColor=colors.HexColor("#111827"),
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name="subtitle",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=11,
            leading=16,
            textColor=colors.HexColor("#4B5563"),
            spaceAfter=14,
        )
    )
    styles.add(
        ParagraphStyle(
            name="sectionTitle",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=19,
            textColor=colors.HexColor("#0F172A"),
            spaceBefore=6,
            spaceAfter=7,
        )
    )
    styles.add(
        ParagraphStyle(
            name="timelineTitle",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=11.5,
            leading=14,
            textColor=colors.HexColor("#1D4ED8"),
            spaceAfter=5,
        )
    )
    styles.add(
        ParagraphStyle(
            name="body",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.3,
            leading=13.2,
            textColor=colors.HexColor("#1F2937"),
            spaceAfter=5,
        )
    )
    styles.add(
        ParagraphStyle(
            name="bullet",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=12.5,
            leftIndent=8,
            textColor=colors.HexColor("#1F2937"),
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="meta",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#6B7280"),
        )
    )

    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=17 * mm,
        leftMargin=17 * mm,
        topMargin=16 * mm,
        bottomMargin=15 * mm,
        title=title,
        author="Classroom Finance 5",
    )

    story = []
    story.append(Paragraph(title, styles["coverTitle"]))
    story.append(
        Paragraph(
            "Past to present evolution of the Classroom Finance 5 project",
            styles["subtitle"],
        )
    )
    for line in intro:
        story.append(Paragraph(line, styles["body"]))
    story.append(Spacer(1, 7 * mm))

    timeline_rows = []
    for section in sections:
        if "title" not in section:
            continue
        body_parts = markdown_to_paragraphs(section["body"], styles)
        timeline_rows.append(
            [
                TimelineMarker(),
                [
                    Paragraph(section["title"], styles["timelineTitle"]),
                    *body_parts,
                ],
            ]
        )

    timeline_table = Table(
        timeline_rows,
        colWidths=[15 * mm, 145 * mm],
        hAlign="LEFT",
        splitByRow=1,
        repeatRows=0,
    )
    timeline_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LINEBEFORE", (0, 1), (0, -1), 1, colors.HexColor("#BFDBFE")),
            ]
        )
    )
    story.append(timeline_table)
    story.append(PageBreak())

    for section in sections:
        if "heading" not in section:
            continue
        story.append(Paragraph(section["heading"], styles["sectionTitle"]))
        story.extend(markdown_to_paragraphs(section["body"], styles))
        story.append(Spacer(1, 4 * mm))

    def draw_footer(canvas, document):
        canvas.saveState()
        width, _ = A4
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(colors.HexColor("#6B7280"))
        footer = f"Classroom Finance 5 project timeline | Page {document.page}"
        canvas.drawString(17 * mm, 9 * mm, footer)
        canvas.drawRightString(width - 17 * mm, 9 * mm, "Generated from repository docs and Git history")
        canvas.restoreState()

    doc.build(story, onFirstPage=draw_footer, onLaterPages=draw_footer)


if __name__ == "__main__":
    build_pdf()
    print(OUTPUT)
