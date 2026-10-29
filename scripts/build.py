from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
notes=[]
for file in sorted((root/'content').rglob('*.md')):
    text=file.read_text()
    _,front,body=text.split('---',2)
    note={}
    for line in front.strip().splitlines():
        key,value=line.split(':',1)
        note[key.strip()]=value.strip()
    note.update(slug=str(file.relative_to(root/'content').with_suffix('')),body=body.strip())
    notes.append(note)
(root/'assets/notes.json').write_text(json.dumps(notes,indent=2))
print(f'Built {len(notes)} Markdown notes')
