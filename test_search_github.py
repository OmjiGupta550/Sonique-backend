import re

with open('C:/Users/OMJI GUPTA/.gemini/antigravity/brain/15322260-96bb-4e9f-a731-e32dc60b1c07/.system_generated/steps/2232/content.md', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Look for file link titles or text in the HTML tree
matches = re.findall(r'href="/OmjiGupta550/Sonique/blob/[^"]+"', content)
print("Blob links found:")
for m in set(matches):
    print(m)
