with open('src/App.jsx', 'r') as f:
    content = f.read()

content = content.replace(
    '''  const { scrollYProgress } = useScroll({
    container: document.getElementById('main-scroll-container') ? { current: document.getElementById('main-scroll-container') } : undefined
  });''',
    '''  const scrollRef = React.useRef(null);
  const { scrollYProgress } = useScroll({ container: scrollRef });'''
)

content = content.replace(
    '<main id="main-scroll-container" className="p-8 pb-24 overflow-y-auto h-[calc(100vh-5rem)]">',
    '<main ref={scrollRef} className="p-8 pb-24 overflow-y-auto h-[calc(100vh-5rem)]">'
)

with open('src/App.jsx', 'w') as f:
    f.write(content)
