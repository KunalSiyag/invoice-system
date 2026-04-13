import re

with open('src/App.jsx', 'r') as f:
    content = f.read()

# Replace THE VAULT with NAQSHI
content = content.replace(
    '<h1 className="text-xl font-bold tracking-widest text-gray-900 uppercase">THE VAULT</h1>',
    '<h1 className="text-xl font-bold tracking-widest text-gray-900 uppercase">NAQSHI</h1>'
)

with open('src/App.jsx', 'w') as f:
    f.write(content)
