import re

with open('src/App.jsx', 'r') as f:
    content = f.read()

# Make the Dashboard tab content scrollable to test scroll animation
content = content.replace(
    '<div className="flex flex-col items-center justify-center h-full text-gray-400">',
    '<div className="flex flex-col items-center justify-center h-full text-gray-400 min-h-[150vh]">'
)

content = content.replace(
    '<main className="p-8 pb-24 overflow-y-auto h-[calc(100vh-5rem)]">',
    '<main id="main-scroll-container" className="p-8 pb-24 overflow-y-auto h-[calc(100vh-5rem)]">'
)

with open('src/App.jsx', 'w') as f:
    f.write(content)
