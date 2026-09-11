import os
import re

routes_dir = 'src/routes'
required_meta = [
    'title:',
    'name: "description"',
    'property: "og:title"',
    'property: "og:description"',
    'property: "og:type"',
    'name: "twitter:card"'
]

findings = {
    'missing_metadata': {},
    'raw_buttons': [],
    'dead_links': []
}

def check_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Check Metadata (only in createFileRoute files)
    if 'createFileRoute' in content:
        missing = []
        for meta in required_meta:
            if meta not in content:
                missing.append(meta)
        if missing:
            findings['missing_metadata'][filepath] = missing
            
    # Check Raw Buttons in product routes (src/routes/app, src/routes/driver, src/routes/portal)
    if any(p in filepath for p in ['src/routes/app', 'src/routes/driver', 'src/routes/portal']):
        if '<button' in content and 'Button' not in content: # Simple heuristic
             # Better check: search for <button tags specifically
             if re.search(r'<button\b', content):
                 findings['raw_buttons'].append(filepath)
        elif '<button' in content:
            # check if it is not just the import
            if re.search(r'<button\b', content):
                 findings['raw_buttons'].append(filepath)

# Walk through routes
for root, dirs, files in os.walk(routes_dir):
    for file in files:
        if file.endswith('.tsx'):
            check_file(os.path.join(root, file))

# Print summary
print("## Audit Findings\n")

print("### High Severity: Missing Required Metadata")
if not findings['missing_metadata']:
    print("No missing metadata found.")
else:
    for file, missing in findings['missing_metadata'].items():
        print(f"- `{file}`: Missing {', '.join(missing)}")

print("\n### Medium Severity: Raw Button Usage in Product Routes")
if not findings['raw_buttons']:
    print("No raw buttons found.")
else:
    for file in findings['raw_buttons']:
        print(f"- `{file}`")

