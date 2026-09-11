import os
import re
from collections import Counter

routes_dir = 'src/routes'
required_meta = [
    'title',
    'name: "description"',
    'property: "og:title"',
    'property: "og:description"',
    'property: "og:type"',
    'name: "twitter:card"'
]

defined_routes = set()
file_to_route = {}
route_to_titles = {}

# Pass 1: Collect defined routes and titles
for root, dirs, files in os.walk(routes_dir):
    for file in files:
        if file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()
            
            route_match = re.search(r'createFileRoute\("([^"]+)"\)', content)
            if route_match:
                route_path = route_match.group(1)
                defined_routes.add(route_path)
                file_to_route[filepath] = route_path
                
                title_match = re.search(r'title: "([^"]+)"', content)
                if title_match:
                    title = title_match.group(1)
                    if title not in route_to_titles:
                        route_to_titles[title] = []
                    route_to_titles[title].append(filepath)

# Pass 2: Audit files
findings = {
    'missing_metadata': {},
    'duplicate_titles': [],
    'dead_links': [],
    'raw_buttons': []
}

for filepath in file_to_route.keys():
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Metadata
    missing = []
    if 'title:' not in content: missing.append('title')
    if 'name: "description"' not in content: missing.append('description')
    if 'property: "og:title"' not in content: missing.append('og:title')
    if 'property: "og:description"' not in content: missing.append('og:description')
    if 'property: "og:type"' not in content: missing.append('og:type')
    if 'name: "twitter:card"' not in content: missing.append('twitter:card')
    
    if missing:
        findings['missing_metadata'][filepath] = missing
    
    # Raw buttons
    if any(p in filepath for p in ['src/routes/app', 'src/routes/driver', 'src/routes/portal']):
        # Ignore files that import Button but still might use raw <button> for something specific?
        # The prompt says "raw button usage in product routes".
        # Let's find <button tags that don't look like they are part of a library or comment
        if re.search(r'<button\b', content):
             findings['raw_buttons'].append(filepath)

    # Dead links
    # Look for to="/..." in Link or navigate
    links = re.findall(r'to[:=]\s*["\'](/[^"\']+)["\']', content)
    for link in links:
        # Strip query params or hash if any
        base_link = link.split('?')[0].split('#')[0]
        # TanStack Router routes might have parameters like /app/trips/$tripId
        # We need to match these.
        
        match_found = False
        if base_link in defined_routes:
            match_found = True
        else:
            # Try to match with placeholders
            # Example: /app/trips/123 should match /app/trips/$tripId
            # But Link to="/app/trips/$tripId" should match directly (which it does in defined_routes)
            # Link to="/app/trips/123" is usually NOT how TanStack Router works with string literals for parameterized routes
            # it uses params={{ tripId: '123' }}.
            # So if it's a string literal starting with /, it should be in defined_routes.
            pass
            
        if not match_found and base_link != '/': # / is usually always valid
             # Check if it's a known static asset or something
             if not base_link.startswith(('/api', '/assets', '/static')):
                 findings['dead_links'].append((filepath, link))

# Check duplicate titles
for title, files in route_to_titles.items():
    if len(files) > 1:
        findings['duplicate_titles'].append((title, files))

# Output Findings
print("# Route and Navigation Audit Report\n")

print("## Critical: Dead/Missing Links")
if not findings['dead_links']:
    print("No dead links detected.")
else:
    for file, link in findings['dead_links']:
        print(f"- `{file}`: Link to `{link}` does not match any defined route.")

print("\n## High Severity: Missing Required Metadata")
if not findings['missing_metadata']:
    print("No missing metadata found.")
else:
    for file, missing in findings['missing_metadata'].items():
        print(f"- `{file}`: Missing {', '.join(missing)}")

print("\n## Medium Severity: Duplicate Titles")
if not findings['duplicate_titles']:
    print("No duplicate titles found.")
else:
    for title, files in findings['duplicate_titles']:
        print(f"- Title \"{title}\" is used in: {', '.join(['`'+f+'`' for f in files])}")

print("\n## Medium Severity: Raw Button Usage in Product Routes")
if not findings['raw_buttons']:
    print("No raw buttons found.")
else:
    for file in findings['raw_buttons']:
        print(f"- `{file}`")
