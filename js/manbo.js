(() => {
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  if (menuButton && nav) {
    const closeMenu = () => {
      nav.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', '打开导航菜单');
    };
    menuButton.addEventListener('click', () => {
      const open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', open);
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
    });
    nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
    document.addEventListener('click', event => { if (!event.target.closest('.nav-shell')) closeMenu(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', () => { if (window.innerWidth > 700) closeMenu(); });
  }

  const article = document.querySelector('#post-content');
  if (!article) return;

  article.querySelectorAll('a[target="_blank"]').forEach(link => {
    link.rel = 'noopener noreferrer';
  });

  const tocShell = document.querySelector('.toc-shell');
  const toc = tocShell?.querySelector('.toc-nav');
  const headings = [...article.querySelectorAll('h2[id], h3[id]')];
  if (!headings.length && tocShell) tocShell.hidden = true;
  if (headings.length && toc) {
    headings.forEach(heading => {
      const link = document.createElement('a');
      link.href = `#${encodeURIComponent(heading.id)}`;
      link.textContent = heading.textContent.trim();
      link.className = heading.tagName === 'H3' ? 'level-3' : 'level-2';
      toc.append(link);
      link.addEventListener('click', () => {
        if (window.innerWidth <= 700) tocShell.querySelector('details').open = false;
      });
    });
    const details = tocShell.querySelector('details');
    const syncDetails = () => { if (window.innerWidth > 700) details.open = true; else details.open = false; };
    syncDetails();
    window.addEventListener('resize', syncDetails);
  }

  const progress = document.querySelector('.reading-progress');
  const tocLinks = toc ? [...toc.querySelectorAll('a')] : [];
  let queued = false;
  const updateReading = () => {
    queued = false;
    const top = article.getBoundingClientRect().top + window.scrollY;
    const bottom = top + article.offsetHeight;
    const readingEnd = Math.max(top + 1, bottom - window.innerHeight + 100);
    const ratio = Math.min(1, Math.max(0, (window.scrollY + 100 - top) / (readingEnd - top)));
    if (progress) progress.style.width = `${Math.round(ratio * 100)}%`;
    if (headings.length) {
      let active = 0;
      headings.forEach((heading, index) => { if (heading.getBoundingClientRect().top <= 160) active = index; });
      tocLinks.forEach((link, index) => {
        link.classList.toggle('active', index === active);
        if (index === active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
  };
  const scheduleReading = () => { if (!queued) { queued = true; requestAnimationFrame(updateReading); } };
  window.addEventListener('scroll', scheduleReading, { passive: true });
  window.addEventListener('resize', scheduleReading);
  scheduleReading();

  const codeBlocks = [...article.querySelectorAll('figure.highlight, pre')].filter(block => {
    return block.matches('figure.highlight') || !block.closest('figure.highlight');
  });
  codeBlocks.forEach(block => {
    const figure = block.matches('figure.highlight');
    const lines = figure ? [...block.querySelectorAll('.code .line')] : [];
    const code = lines.length ? lines.map(line => line.textContent).join('\n') +
      (block.querySelector('.code pre')?.lastElementChild?.tagName === 'BR' ? '\n' : '') :
      (figure ? block.querySelector('.code pre')?.textContent : block.querySelector('code')?.textContent || block.textContent) || '';
    const wrapper = document.createElement('div');
    wrapper.className = 'code-panel';
    const toolbar = document.createElement('div');
    toolbar.className = 'code-toolbar';
    const language = document.createElement('span');
    const classLanguage = figure ? [...block.classList].find(name => name !== 'highlight') : null;
    language.textContent = block.querySelector('figcaption')?.textContent.trim() || classLanguage || block.querySelector('code')?.className.replace(/^language-/, '') || '代码';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = '复制代码';
    copy.setAttribute('aria-label', '复制代码');
    copy.addEventListener('click', async () => {
      try {
        if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
        await navigator.clipboard.writeText(code);
        copy.textContent = '已复制';
      } catch { copy.textContent = '复制失败'; }
      window.setTimeout(() => { copy.textContent = '复制代码'; }, 2200);
    });
    toolbar.append(language, copy);
    block.parentNode.insertBefore(wrapper, block);
    wrapper.append(toolbar, block);
  });

  const dialog = document.querySelector('.lightbox');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const stage = dialog.querySelector('.lightbox-stage');
  const preview = stage.querySelector('img');
  const altLabel = dialog.querySelector('.lightbox-alt');
  let scale = 1, panX = 0, panY = 0, lastFocus = null;
  const pointers = new Map();
  let dragStart = null, pinchStart = null;
  const paint = () => { preview.style.setProperty('--zoom', scale); preview.style.setProperty('--pan-x', `${panX}px`); preview.style.setProperty('--pan-y', `${panY}px`); };
  const reset = () => { scale = 1; panX = 0; panY = 0; paint(); };
  const close = () => { dialog.close(); };
  article.querySelectorAll('img').forEach(image => {
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    image.setAttribute('aria-label', image.alt ? `放大图片：${image.alt}` : '放大图片');
    const open = () => {
      lastFocus = document.activeElement;
      preview.src = image.currentSrc || image.src;
      preview.alt = image.alt;
      altLabel.textContent = image.alt || '图片预览';
      reset();
      dialog.showModal();
      dialog.querySelector('.lightbox-close').focus();
    };
    image.addEventListener('click', open);
    image.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
  });
  dialog.querySelector('.lightbox-close').addEventListener('click', close);
  dialog.querySelector('.lightbox-reset').addEventListener('click', reset);
  dialog.addEventListener('click', event => { if (event.target === dialog || event.target === stage) close(); });
  dialog.addEventListener('close', () => { preview.removeAttribute('src'); pointers.clear(); lastFocus?.focus?.(); });
  dialog.addEventListener('keydown', event => {
    if (event.key === '+' || event.key === '=') { scale = Math.min(5, scale * 1.2); paint(); }
    if (event.key === '-') { scale = Math.max(1, scale / 1.2); paint(); }
  });
  stage.addEventListener('wheel', event => {
    event.preventDefault();
    scale = Math.min(5, Math.max(1, scale * (event.deltaY < 0 ? 1.12 : 1 / 1.12)));
    if (scale === 1) { panX = 0; panY = 0; }
    paint();
  }, { passive: false });
  const distance = points => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  stage.addEventListener('pointerdown', event => {
    stage.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) dragStart = { x: event.clientX, y: event.clientY, panX, panY };
    if (pointers.size === 2) pinchStart = { distance: distance([...pointers.values()]), scale };
  });
  stage.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2 && pinchStart) scale = Math.min(5, Math.max(1, pinchStart.scale * distance([...pointers.values()]) / Math.max(1, pinchStart.distance)));
    else if (pointers.size === 1 && dragStart && scale > 1) { panX = dragStart.panX + event.clientX - dragStart.x; panY = dragStart.panY + event.clientY - dragStart.y; }
    paint();
  });
  const endPointer = event => { pointers.delete(event.pointerId); dragStart = null; pinchStart = null; };
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);
})();
